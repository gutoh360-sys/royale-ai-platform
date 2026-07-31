from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from urllib.parse import quote

from backend.core.config.base import Settings
from backend.core.logging import get_logger
from backend.core.security.encryption import EncryptionService
from backend.database.models.connection import IntegrationConnection
from backend.modules.integration.client import BlingApiClient, TokenResponse
from backend.modules.integration.errors import (
    OAuthExchangeError,
    OAuthPermanentError,
    OAuthRefreshError,
    OAuthStateError,
    TokenRevocationError,
)
from backend.modules.integration.ports import IBlingConnectionRepository
from backend.modules.integration.state import OAuthStateService

BLING_PROVIDER = "bling"


@dataclass(frozen=True)
class AuthorizationURL:
    url: str


@dataclass(frozen=True)
class CallbackResult:
    status: str
    message: str


@dataclass(frozen=True)
class ConnectionStatus:
    provider: str
    status: str
    connected: bool
    last_authenticated_at: datetime | None
    scopes: list[str] | None


@dataclass(frozen=True)
class ConnectionTestResult:
    status: str
    detail: str


class IntegrationConnectionService:
    def __init__(
        self,
        repo: IBlingConnectionRepository,
        state: OAuthStateService,
        client: BlingApiClient,
        crypto: EncryptionService,
        settings: Settings,
    ) -> None:
        self._repo = repo
        self._state = state
        self._client = client
        self._crypto = crypto
        self._settings = settings
        self._logger = get_logger(__name__)

    @staticmethod
    def _utcnow() -> datetime:
        return datetime.now(UTC)

    def _is_expired(self, expires_at: datetime | None, margin_seconds: int) -> bool:
        if expires_at is None:
            return False
        return self._utcnow() + timedelta(seconds=margin_seconds) >= expires_at

    def _apply_tokens(self, conn: IntegrationConnection, tokens: TokenResponse) -> None:
        now = self._utcnow()
        margin = max(self._settings.BLING_ACCESS_TOKEN_MARGIN_SECONDS, 0)
        conn.access_token = self._crypto.encrypt(tokens.access_token)
        conn.refresh_token = self._crypto.encrypt(tokens.refresh_token)
        conn.access_token_expires_at = now + timedelta(seconds=max(tokens.expires_in - margin, 0))
        conn.refresh_token_expires_at = now + timedelta(
            days=self._settings.BLING_REFRESH_TOKEN_LIFETIME_DAYS
        )
        conn.scopes = tokens.scope
        conn.status = "active"
        conn.last_authenticated_at = now

    async def build_authorization_url(self) -> AuthorizationURL:
        state = self._state.generate()
        await self._state.store(state)
        url = (
            f"{self._settings.BLING_AUTHORIZE_URL}"
            f"?response_type=code&client_id={quote(self._settings.BLING_CLIENT_ID, safe='')}"
            f"&state={quote(state, safe='')}"
            f"&redirect_uri={quote(self._settings.BLING_REDIRECT_URI, safe='')}"
        )
        return AuthorizationURL(url=url)

    async def handle_callback(
        self,
        code: str | None,
        state: str | None,
        error: str | None,
        error_description: str | None,
    ) -> CallbackResult:
        if error is not None:
            if state is not None:
                await self._state.validate_and_consume(state)
            return CallbackResult(status="denied", message="Authorization was not completed")
        if state is None:
            raise OAuthStateError("Missing OAuth state")
        valid = await self._state.validate_and_consume(state)
        if not valid:
            raise OAuthStateError("Invalid, expired or reused OAuth state")
        if code is None:
            raise OAuthStateError("Missing authorization code")
        try:
            tokens = await self._client.exchange_code(code)
        except OAuthExchangeError as exc:
            raise OAuthExchangeError("Failed to exchange authorization code with Bling") from exc
        await self._persist_tokens(tokens)
        return CallbackResult(status="authorized", message="Authorization completed")

    async def _persist_tokens(self, tokens: TokenResponse) -> IntegrationConnection:
        conn = IntegrationConnection(provider=BLING_PROVIDER, company_id=None)
        self._apply_tokens(conn, tokens)
        return await self._repo.upsert(conn)

    async def get_status(self) -> ConnectionStatus:
        conn = await self._repo.get(BLING_PROVIDER)
        if conn is None:
            return ConnectionStatus(
                provider=BLING_PROVIDER,
                status="disconnected",
                connected=False,
                last_authenticated_at=None,
                scopes=None,
            )
        scopes = conn.scopes.split(",") if conn.scopes else None
        return ConnectionStatus(
            provider=conn.provider,
            status=conn.status,
            connected=conn.status == "active",
            last_authenticated_at=conn.last_authenticated_at,
            scopes=scopes,
        )

    async def disconnect(self) -> None:
        conn = await self._repo.get(BLING_PROVIDER)
        if conn is None or conn.refresh_token is None:
            return
        refresh = self._crypto.decrypt(conn.refresh_token)
        try:
            await self._client.revoke_token(refresh, "refresh_token")
        except TokenRevocationError as exc:
            raise TokenRevocationError(
                "Failed to revoke Bling tokens; connection was not disconnected"
            ) from exc
        if conn.access_token is not None:
            access = self._crypto.decrypt(conn.access_token)
            try:
                await self._client.revoke_token(access, "access_token")
            except TokenRevocationError:
                self._logger.warning(
                    "bling_access_token_revocation_failed",
                    detail="Refresh token revoked; access token revocation failed",
                )
        conn.access_token = None
        conn.refresh_token = None
        conn.status = "disconnected"
        await self._repo.upsert(conn)

    async def get_valid_access_token(self) -> str:
        conn = await self._repo.get(BLING_PROVIDER)
        if conn is None or conn.access_token is None or conn.refresh_token is None:
            raise OAuthPermanentError("No active Bling connection; reauthorization required")
        if conn.status != "active":
            raise OAuthPermanentError("Bling connection is not active; reauthorization required")
        margin = self._settings.BLING_ACCESS_TOKEN_MARGIN_SECONDS
        if not self._is_expired(conn.access_token_expires_at, margin):
            return self._crypto.decrypt(conn.access_token)
        return await self._refresh_access_token_locked()

    async def _refresh_access_token_locked(self) -> str:
        conn = await self._repo.lock_for_update(BLING_PROVIDER)
        if conn is None or conn.access_token is None or conn.refresh_token is None:
            raise OAuthPermanentError("No active Bling connection; reauthorization required")
        margin = self._settings.BLING_ACCESS_TOKEN_MARGIN_SECONDS
        if not self._is_expired(conn.access_token_expires_at, margin):
            return self._crypto.decrypt(conn.access_token)
        try:
            tokens = await self._client.refresh_token(self._crypto.decrypt(conn.refresh_token))
        except OAuthRefreshError as exc:
            if exc.status_code in (400, 401):
                conn.status = "requires_reauthorization"
                await self._repo.upsert(conn)
                raise OAuthPermanentError(
                    "Bling refresh failed permanently; reauthorization required"
                ) from exc
            raise
        self._apply_tokens(conn, tokens)
        await self._repo.upsert(conn)
        return tokens.access_token

    async def test_connection(self) -> ConnectionTestResult:
        response = await self._client.get_authenticated(
            self._settings.BLING_TEST_ENDPOINT, self.get_valid_access_token
        )
        if response.status_code == 200:
            return ConnectionTestResult(status="ok", detail="Bling connection is working")
        if response.status_code == 403:
            return ConnectionTestResult(
                status="scope_error",
                detail="Bling requires additional scopes for this endpoint",
            )
        return ConnectionTestResult(
            status="error", detail=f"Bling returned status {response.status_code}"
        )
