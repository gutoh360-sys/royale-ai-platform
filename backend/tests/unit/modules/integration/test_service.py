from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
import pytest

from backend.core.config.base import Settings
from backend.core.security.encryption import EncryptionService
from backend.database.models.connection import IntegrationConnection
from backend.modules.integration.client import BlingApiClient
from backend.modules.integration.errors import (
    ApiError,
    OAuthExchangeError,
    OAuthPermanentError,
    OAuthRefreshError,
    OAuthStateError,
    TokenRevocationError,
)
from backend.modules.integration.ports import IBlingConnectionRepository
from backend.modules.integration.service import IntegrationConnectionService
from backend.modules.integration.state import OAuthStateService

BLING = "bling"


class InMemoryConnectionRepository(IBlingConnectionRepository):
    def __init__(self) -> None:
        self.connection: IntegrationConnection | None = None

    async def get(self, provider: str) -> IntegrationConnection | None:
        return self.connection

    async def lock_for_update(self, provider: str) -> IntegrationConnection | None:
        return self.connection

    async def upsert(self, connection: IntegrationConnection) -> IntegrationConnection:
        if self.connection is None:
            self.connection = connection
        else:
            self.connection.company_id = connection.company_id
            self.connection.access_token = connection.access_token
            self.connection.refresh_token = connection.refresh_token
            self.connection.access_token_expires_at = connection.access_token_expires_at
            self.connection.refresh_token_expires_at = connection.refresh_token_expires_at
            self.connection.scopes = connection.scopes
            self.connection.status = connection.status
            self.connection.last_authenticated_at = connection.last_authenticated_at
        return self.connection


def _token_json(
    access: str = "new-access",
    refresh: str = "new-refresh",
    expires_in: int = 3600,
    scope: str = "a.b.c",
) -> dict[str, Any]:
    return {
        "access_token": access,
        "refresh_token": refresh,
        "expires_in": expires_in,
        "token_type": "Bearer",
        "scope": scope,
    }


def _dispatcher(
    settings: Settings,
    *,
    on_token: Callable[[httpx.Request], httpx.Response] | None = None,
    on_api: Callable[[httpx.Request], httpx.Response] | None = None,
    on_revoke: Callable[[httpx.Request], httpx.Response] | None = None,
) -> Callable[[httpx.Request], httpx.Response]:
    def handler(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if url == settings.BLING_TOKEN_URL:
            if on_token is not None:
                return on_token(request)
            return httpx.Response(200, json=_token_json())
        if url == settings.BLING_REVOKE_URL:
            if on_revoke is not None:
                return on_revoke(request)
            return httpx.Response(204)
        if url.startswith(settings.BLING_API_BASE_URL):
            if on_api is not None:
                return on_api(request)
            return httpx.Response(200, json={})
        return httpx.Response(404, json={})

    return handler


def _make_client(
    settings: Settings,
    handler: Callable[[httpx.Request], httpx.Response],
) -> BlingApiClient:
    transport = httpx.MockTransport(handler)
    http = httpx.AsyncClient(transport=transport, timeout=httpx.Timeout(1.0))
    return BlingApiClient(settings, client=http)


def _make_service(
    settings: Settings,
    crypto: EncryptionService,
    repo: InMemoryConnectionRepository,
    state: OAuthStateService,
    handler: Callable[[httpx.Request], httpx.Response],
) -> IntegrationConnectionService:
    return IntegrationConnectionService(
        repo, state, _make_client(settings, handler), crypto, settings
    )


def _seed_connection(
    repo: InMemoryConnectionRepository,
    crypto: EncryptionService,
    *,
    access: str = "plain-access",
    refresh: str = "plain-refresh",
    access_expires_delta: timedelta = timedelta(hours=1),
    status: str = "active",
) -> IntegrationConnection:
    conn = IntegrationConnection(
        provider=BLING,
        company_id=None,
        access_token=crypto.encrypt(access),
        refresh_token=crypto.encrypt(refresh),
        access_token_expires_at=datetime.now(UTC) + access_expires_delta,
        refresh_token_expires_at=datetime.now(UTC) + timedelta(days=29),
        scopes="a.b.c",
        status=status,
        last_authenticated_at=datetime.now(UTC),
    )
    repo.connection = conn
    return conn


async def test_build_authorization_url(
    settings: Settings,
    crypto: EncryptionService,
    fake_cache: Any,
) -> None:
    repo = InMemoryConnectionRepository()
    state = OAuthStateService(fake_cache, settings.BLING_OAUTH_STATE_TTL_SECONDS)
    service = _make_service(settings, crypto, repo, state, _dispatcher(settings))

    result = await service.build_authorization_url()

    assert result.url.startswith(settings.BLING_AUTHORIZE_URL)
    assert "response_type=code" in result.url
    assert "client_id=test-client-id" in result.url
    assert "state=" in result.url
    assert "redirect_uri=http%3A%2F%2Ftest%2Fbling%2Fcallback" in result.url
    state_value = result.url.split("state=")[1].split("&")[0]
    assert await fake_cache.exists(f"oauth:state:{state_value}") is True


async def test_callback_with_error_does_not_exchange(
    settings: Settings,
    crypto: EncryptionService,
    fake_cache: Any,
) -> None:
    exchange_calls = 0

    def on_token(request: httpx.Request) -> httpx.Response:
        nonlocal exchange_calls
        exchange_calls += 1
        return httpx.Response(200, json=_token_json())

    repo = InMemoryConnectionRepository()
    state = OAuthStateService(fake_cache, settings.BLING_OAUTH_STATE_TTL_SECONDS)
    service = _make_service(settings, crypto, repo, state, _dispatcher(settings, on_token=on_token))

    result = await service.handle_callback(
        code=None, state="some-state", error="access_denied", error_description="denied"
    )

    assert result.status == "denied"
    assert exchange_calls == 0


async def test_callback_missing_state_raises(
    settings: Settings,
    crypto: EncryptionService,
    fake_cache: Any,
) -> None:
    repo = InMemoryConnectionRepository()
    state = OAuthStateService(fake_cache, settings.BLING_OAUTH_STATE_TTL_SECONDS)
    service = _make_service(settings, crypto, repo, state, _dispatcher(settings))

    with pytest.raises(OAuthStateError):
        await service.handle_callback(code="code", state=None, error=None, error_description=None)


async def test_callback_reused_state_raises(
    settings: Settings,
    crypto: EncryptionService,
    fake_cache: Any,
) -> None:
    repo = InMemoryConnectionRepository()
    state = OAuthStateService(fake_cache, settings.BLING_OAUTH_STATE_TTL_SECONDS)
    service = _make_service(settings, crypto, repo, state, _dispatcher(settings))
    state_value = state.generate()
    await state.store(state_value)

    first = await service.handle_callback(
        code="code", state=state_value, error=None, error_description=None
    )
    assert first.status == "authorized"

    with pytest.raises(OAuthStateError):
        await service.handle_callback(
            code="code", state=state_value, error=None, error_description=None
        )


async def test_callback_missing_code_raises(
    settings: Settings,
    crypto: EncryptionService,
    fake_cache: Any,
) -> None:
    repo = InMemoryConnectionRepository()
    state = OAuthStateService(fake_cache, settings.BLING_OAUTH_STATE_TTL_SECONDS)
    service = _make_service(settings, crypto, repo, state, _dispatcher(settings))
    state_value = state.generate()
    await state.store(state_value)

    with pytest.raises(OAuthStateError):
        await service.handle_callback(
            code=None, state=state_value, error=None, error_description=None
        )


async def test_callback_persists_encrypted_tokens(
    settings: Settings,
    crypto: EncryptionService,
    fake_cache: Any,
) -> None:
    repo = InMemoryConnectionRepository()
    state = OAuthStateService(fake_cache, settings.BLING_OAUTH_STATE_TTL_SECONDS)
    service = _make_service(settings, crypto, repo, state, _dispatcher(settings))
    state_value = state.generate()
    await state.store(state_value)

    result = await service.handle_callback(
        code="the-code", state=state_value, error=None, error_description=None
    )

    assert result.status == "authorized"
    assert repo.connection is not None
    assert repo.connection.access_token is not None
    assert repo.connection.refresh_token is not None
    assert repo.connection.access_token_expires_at is not None
    assert repo.connection.refresh_token_expires_at is not None
    assert repo.connection.access_token != "new-access"
    assert crypto.decrypt(repo.connection.access_token) == "new-access"
    assert crypto.decrypt(repo.connection.refresh_token) == "new-refresh"
    assert repo.connection.status == "active"
    assert repo.connection.company_id is None
    assert repo.connection.access_token_expires_at > datetime.now(UTC)
    assert repo.connection.refresh_token_expires_at > datetime.now(UTC) + timedelta(days=20)


async def test_callback_exchange_failure_raises(
    settings: Settings,
    crypto: EncryptionService,
    fake_cache: Any,
) -> None:
    def on_token(request: httpx.Request) -> httpx.Response:
        return httpx.Response(400, json={"error": "invalid_grant"})

    repo = InMemoryConnectionRepository()
    state = OAuthStateService(fake_cache, settings.BLING_OAUTH_STATE_TTL_SECONDS)
    service = _make_service(settings, crypto, repo, state, _dispatcher(settings, on_token=on_token))
    state_value = state.generate()
    await state.store(state_value)

    with pytest.raises(OAuthExchangeError):
        await service.handle_callback(
            code="the-code", state=state_value, error=None, error_description=None
        )
    assert repo.connection is None


async def test_jwt_claims_do_not_populate_company_id(
    settings: Settings,
    crypto: EncryptionService,
    fake_cache: Any,
) -> None:
    jwt_token = "eyJhbGciOiJIUzI1NiJ9.eyJjb21wYW55X2lkIjoiY21wLTEyMyJ9.signature"

    def on_token(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=_token_json(access=jwt_token))

    repo = InMemoryConnectionRepository()
    state = OAuthStateService(fake_cache, settings.BLING_OAUTH_STATE_TTL_SECONDS)
    service = _make_service(settings, crypto, repo, state, _dispatcher(settings, on_token=on_token))
    state_value = state.generate()
    await state.store(state_value)

    await service.handle_callback(
        code="the-code", state=state_value, error=None, error_description=None
    )

    assert repo.connection is not None
    assert repo.connection.company_id is None
    assert repo.connection.access_token is not None
    assert crypto.decrypt(repo.connection.access_token) == jwt_token


async def test_status_disconnected_when_no_connection(
    settings: Settings,
    crypto: EncryptionService,
    fake_cache: Any,
) -> None:
    repo = InMemoryConnectionRepository()
    state = OAuthStateService(fake_cache, settings.BLING_OAUTH_STATE_TTL_SECONDS)
    service = _make_service(settings, crypto, repo, state, _dispatcher(settings))

    status = await service.get_status()

    assert status.connected is False
    assert status.status == "disconnected"
    assert status.scopes is None


async def test_status_active_with_scopes(
    settings: Settings,
    crypto: EncryptionService,
    fake_cache: Any,
) -> None:
    repo = InMemoryConnectionRepository()
    _seed_connection(repo, crypto)
    state = OAuthStateService(fake_cache, settings.BLING_OAUTH_STATE_TTL_SECONDS)
    service = _make_service(settings, crypto, repo, state, _dispatcher(settings))

    status = await service.get_status()

    assert status.connected is True
    assert status.status == "active"
    assert status.provider == BLING
    assert status.scopes == ["a.b.c"]


async def test_disconnect_revokes_and_clears_tokens(
    settings: Settings,
    crypto: EncryptionService,
    fake_cache: Any,
) -> None:
    repo = InMemoryConnectionRepository()
    _seed_connection(repo, crypto)
    revoke_bodies: list[str] = []

    def on_revoke(request: httpx.Request) -> httpx.Response:
        revoke_bodies.append(request.read().decode())
        return httpx.Response(204)

    state = OAuthStateService(fake_cache, settings.BLING_OAUTH_STATE_TTL_SECONDS)
    service = _make_service(
        settings, crypto, repo, state, _dispatcher(settings, on_revoke=on_revoke)
    )

    await service.disconnect()

    assert len(revoke_bodies) == 2
    assert any("token_type_hint=refresh_token" in body for body in revoke_bodies)
    assert any("token_type_hint=access_token" in body for body in revoke_bodies)
    assert repo.connection is not None
    assert repo.connection.access_token is None
    assert repo.connection.refresh_token is None
    assert repo.connection.status == "disconnected"


async def test_disconnect_revoke_failure_keeps_tokens(
    settings: Settings,
    crypto: EncryptionService,
    fake_cache: Any,
) -> None:
    repo = InMemoryConnectionRepository()
    _seed_connection(repo, crypto)

    def on_revoke(request: httpx.Request) -> httpx.Response:
        return httpx.Response(503, json={})

    state = OAuthStateService(fake_cache, settings.BLING_OAUTH_STATE_TTL_SECONDS)
    service = _make_service(
        settings, crypto, repo, state, _dispatcher(settings, on_revoke=on_revoke)
    )

    with pytest.raises(TokenRevocationError):
        await service.disconnect()

    assert repo.connection is not None
    assert repo.connection.access_token is not None
    assert repo.connection.refresh_token is not None
    assert repo.connection.status == "active"


async def test_disconnect_when_no_connection_is_noop(
    settings: Settings,
    crypto: EncryptionService,
    fake_cache: Any,
) -> None:
    repo = InMemoryConnectionRepository()
    state = OAuthStateService(fake_cache, settings.BLING_OAUTH_STATE_TTL_SECONDS)
    service = _make_service(settings, crypto, repo, state, _dispatcher(settings))

    await service.disconnect()

    assert repo.connection is None


async def test_test_connection_403_keeps_tokens(
    settings: Settings,
    crypto: EncryptionService,
    fake_cache: Any,
) -> None:
    repo = InMemoryConnectionRepository()
    _seed_connection(repo, crypto)

    def on_api(request: httpx.Request) -> httpx.Response:
        return httpx.Response(403, json={})

    state = OAuthStateService(fake_cache, settings.BLING_OAUTH_STATE_TTL_SECONDS)
    service = _make_service(settings, crypto, repo, state, _dispatcher(settings, on_api=on_api))

    result = await service.test_connection()

    assert result.status == "scope_error"
    assert repo.connection is not None
    assert repo.connection.access_token is not None
    assert repo.connection.status == "active"


async def test_test_connection_ok(
    settings: Settings,
    crypto: EncryptionService,
    fake_cache: Any,
) -> None:
    repo = InMemoryConnectionRepository()
    _seed_connection(repo, crypto)
    state = OAuthStateService(fake_cache, settings.BLING_OAUTH_STATE_TTL_SECONDS)
    service = _make_service(settings, crypto, repo, state, _dispatcher(settings))

    result = await service.test_connection()

    assert result.status == "ok"


async def test_get_valid_access_token_fast_path_no_refresh(
    settings: Settings,
    crypto: EncryptionService,
    fake_cache: Any,
) -> None:
    repo = InMemoryConnectionRepository()
    _seed_connection(repo, crypto, access="valid-access")

    def on_token(request: httpx.Request) -> httpx.Response:
        raise AssertionError("refresh should not happen")

    state = OAuthStateService(fake_cache, settings.BLING_OAUTH_STATE_TTL_SECONDS)
    service = _make_service(settings, crypto, repo, state, _dispatcher(settings, on_token=on_token))

    token = await service.get_valid_access_token()

    assert token == "valid-access"


async def test_get_valid_access_token_refreshes_and_rotates(
    settings: Settings,
    crypto: EncryptionService,
    fake_cache: Any,
) -> None:
    repo = InMemoryConnectionRepository()
    _seed_connection(
        repo, crypto, access="expired-access", access_expires_delta=timedelta(minutes=-5)
    )
    state = OAuthStateService(fake_cache, settings.BLING_OAUTH_STATE_TTL_SECONDS)
    service = _make_service(settings, crypto, repo, state, _dispatcher(settings))

    token = await service.get_valid_access_token()

    assert token == "new-access"
    assert repo.connection is not None
    assert repo.connection.refresh_token is not None
    assert crypto.decrypt(repo.connection.refresh_token) == "new-refresh"
    assert repo.connection.status == "active"
    assert repo.connection.company_id is None


async def test_refresh_permanent_error_marks_requires_reauthorization(
    settings: Settings,
    crypto: EncryptionService,
    fake_cache: Any,
) -> None:
    repo = InMemoryConnectionRepository()
    seeded = _seed_connection(
        repo, crypto, access="expired-access", access_expires_delta=timedelta(minutes=-5)
    )

    def on_token(request: httpx.Request) -> httpx.Response:
        return httpx.Response(400, json={"error": "invalid_grant"})

    state = OAuthStateService(fake_cache, settings.BLING_OAUTH_STATE_TTL_SECONDS)
    service = _make_service(settings, crypto, repo, state, _dispatcher(settings, on_token=on_token))

    with pytest.raises(OAuthPermanentError):
        await service.get_valid_access_token()

    assert repo.connection is not None
    assert repo.connection.status == "requires_reauthorization"
    assert repo.connection.access_token == seeded.access_token
    assert repo.connection.refresh_token == seeded.refresh_token


async def test_refresh_transient_error_keeps_active(
    settings: Settings,
    crypto: EncryptionService,
    fake_cache: Any,
) -> None:
    repo = InMemoryConnectionRepository()
    _seed_connection(
        repo, crypto, access="expired-access", access_expires_delta=timedelta(minutes=-5)
    )

    def on_token(request: httpx.Request) -> httpx.Response:
        return httpx.Response(503, json={})

    state = OAuthStateService(fake_cache, settings.BLING_OAUTH_STATE_TTL_SECONDS)
    service = _make_service(settings, crypto, repo, state, _dispatcher(settings, on_token=on_token))

    with pytest.raises(OAuthRefreshError):
        await service.get_valid_access_token()

    assert repo.connection is not None
    assert repo.connection.status == "active"
    assert repo.connection.access_token is not None


async def test_get_valid_access_token_without_connection_raises(
    settings: Settings,
    crypto: EncryptionService,
    fake_cache: Any,
) -> None:
    repo = InMemoryConnectionRepository()
    state = OAuthStateService(fake_cache, settings.BLING_OAUTH_STATE_TTL_SECONDS)
    service = _make_service(settings, crypto, repo, state, _dispatcher(settings))

    with pytest.raises(OAuthPermanentError):
        await service.get_valid_access_token()


async def test_test_connection_network_error_reports_error(
    settings: Settings,
    crypto: EncryptionService,
    fake_cache: Any,
) -> None:
    repo = InMemoryConnectionRepository()
    _seed_connection(repo, crypto)

    def on_api(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectTimeout("boom", request=request)

    state = OAuthStateService(fake_cache, settings.BLING_OAUTH_STATE_TTL_SECONDS)
    service = _make_service(settings, crypto, repo, state, _dispatcher(settings, on_api=on_api))

    with pytest.raises(ApiError):
        await service.test_connection()
