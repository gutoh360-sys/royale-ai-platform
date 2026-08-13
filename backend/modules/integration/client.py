import asyncio
import base64
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any, cast
from urllib.parse import urlencode, urlsplit, urlunsplit

import httpx

from backend.core.config.base import Settings
from backend.modules.integration.errors import (
    ApiError,
    OAuthExchangeError,
    OAuthRefreshError,
    TokenRevocationError,
)


@dataclass(frozen=True)
class TokenResponse:
    access_token: str
    refresh_token: str
    expires_in: int
    scope: str | None = None


def redact_url(url: str) -> str:
    parts = urlsplit(url)
    return f"{parts.scheme}://{parts.netloc}{parts.path}"


def _with_query(url: str, params: dict[str, str | int]) -> str:
    parts = urlsplit(url)
    query = urlencode(params)
    if parts.query:
        query = parts.query + "&" + query
    return urlunsplit((parts.scheme, parts.netloc, parts.path, query, parts.fragment))


class BlingApiClient:
    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None) -> None:
        self._settings = settings
        self._client = client or httpx.AsyncClient(
            timeout=httpx.Timeout(settings.BLING_REQUEST_TIMEOUT_SECONDS)
        )
        self._min_request_interval = 1.0 / max(settings.BLING_MAX_REQUESTS_PER_SECOND, 0.1)
        self._last_request_at = 0.0

    async def aclose(self) -> None:
        await self._client.aclose()

    def _basic_auth(self) -> str:
        raw = f"{self._settings.BLING_CLIENT_ID}:{self._settings.BLING_CLIENT_SECRET}".encode()
        return "Basic " + base64.b64encode(raw).decode()

    async def _throttle(self) -> None:
        now = time.monotonic()
        wait = self._last_request_at + self._min_request_interval - now
        if wait > 0:
            await asyncio.sleep(wait)
        self._last_request_at = time.monotonic()

    def _sanitize_request_error(self, exc: httpx.HTTPError) -> str:
        request = getattr(exc, "request", None)
        if request is not None:
            return f"{type(exc).__name__} during {request.method} {redact_url(str(request.url))}"
        return type(exc).__name__

    async def _post_form(
        self,
        url: str,
        form: dict[str, str],
        error_type: type[OAuthExchangeError] | type[OAuthRefreshError],
    ) -> dict[str, Any]:
        await self._throttle()
        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": self._basic_auth(),
            "enable-jwt": "1",
        }
        try:
            response = await self._client.post(url, data=form, headers=headers)
        except httpx.HTTPError as exc:
            raise error_type(self._sanitize_request_error(exc)) from exc
        if response.status_code != 200:
            raise error_type(
                f"token request failed with status {response.status_code}",
                status_code=response.status_code,
            )
        return cast(dict[str, Any], response.json())

    async def exchange_code(self, code: str) -> TokenResponse:
        payload = await self._post_form(
            self._settings.BLING_TOKEN_URL,
            {"grant_type": "authorization_code", "code": code},
            OAuthExchangeError,
        )
        return self._parse_token_response(payload)

    async def refresh_token(self, refresh_token: str) -> TokenResponse:
        payload = await self._post_form(
            self._settings.BLING_TOKEN_URL,
            {"grant_type": "refresh_token", "refresh_token": refresh_token},
            OAuthRefreshError,
        )
        return self._parse_token_response(payload)

    async def revoke_token(self, token: str, token_type_hint: str) -> None:
        await self._throttle()
        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": self._basic_auth(),
        }
        form = {"token": token, "token_type_hint": token_type_hint}
        try:
            response = await self._client.post(
                self._settings.BLING_REVOKE_URL, data=form, headers=headers
            )
        except httpx.HTTPError as exc:
            raise TokenRevocationError(self._sanitize_request_error(exc)) from exc
        if response.status_code >= 300:
            raise TokenRevocationError(f"revocation failed with status {response.status_code}")

    async def get_authenticated(
        self,
        path: str,
        token_provider: Callable[[], Awaitable[str]],
        params: dict[str, str | int] | None = None,
    ) -> httpx.Response:
        url = self._settings.BLING_API_BASE_URL + path
        if params:
            url = _with_query(url, params)
        transient_attempts = 0
        refreshed = False
        while True:
            token = await token_provider()
            await self._throttle()
            headers = {"Authorization": f"Bearer {token}", "enable-jwt": "1"}
            try:
                response = await self._client.get(url, headers=headers)
            except httpx.HTTPError as exc:
                raise ApiError(self._sanitize_request_error(exc)) from exc
            if response.status_code == 401 and not refreshed:
                refreshed = True
                continue
            if response.status_code == 429 and (
                transient_attempts < self._settings.BLING_MAX_RETRIES
            ):
                transient_attempts += 1
                await self._wait_retry_after(response)
                continue
            if (
                response.status_code >= 500
                and transient_attempts < self._settings.BLING_MAX_RETRIES
            ):
                transient_attempts += 1
                await self._wait_backoff(transient_attempts)
                continue
            return response

    async def _wait_retry_after(self, response: httpx.Response) -> None:
        retry_after = response.headers.get("Retry-After")
        seconds = float(retry_after) if retry_after is not None and retry_after.isdigit() else 0.5
        await asyncio.sleep(min(seconds, self._settings.BLING_MAX_BACKOFF_SECONDS))

    async def _wait_backoff(self, attempt: int) -> None:
        await asyncio.sleep(min(0.5 * attempt, self._settings.BLING_MAX_BACKOFF_SECONDS))

    async def list_resource(
        self,
        path: str,
        token_provider: Callable[[], Awaitable[str]],
        params: dict[str, str | int],
        max_pages: int | None = None,
    ) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        page = 1
        while True:
            query = dict(params)
            query["pagina"] = page
            response = await self.get_authenticated(path, token_provider, query)
            if response.status_code != 200:
                raise ApiError(f"list resource failed with status {response.status_code}")
            body = response.json()
            payload = body.get("data")
            if isinstance(payload, list):
                items.extend(cast(list[dict[str, Any]], payload))
            elif isinstance(payload, dict):
                items.append(payload)
            asked_total_pages = (body.get("response") or {}).get("paginacao") or {}
            total_pages = (
                int(asked_total_pages["totalPaginas"])
                if asked_total_pages.get("totalPaginas") is not None
                else 1
            )
            if max_pages is not None and page >= max_pages:
                break
            if page >= total_pages:
                break
            page += 1
        return items

    async def fetch_products(
        self,
        token_provider: Callable[[], Awaitable[str]],
        *,
        page_size: int = 100,
        max_pages: int | None = None,
    ) -> list[dict[str, Any]]:
        if max_pages is None:
            max_pages = self._settings.BLING_PRODUCT_SYNC_MAX_PAGES
        return await self.list_resource(
            "/produtos",
            token_provider,
            {"limite": page_size, "criterio": 2, "tipo": "T"},
            max_pages=max_pages,
        )

    async def fetch_categories(
        self,
        token_provider: Callable[[], Awaitable[str]],
    ) -> list[dict[str, Any]]:
        return await self.list_resource(
            "/categorias/produtos", token_provider, {"limite": 100}
        )

    async def fetch_orders(
        self,
        token_provider: Callable[[], Awaitable[str]],
        *,
        page_size: int = 100,
        data_inicial: str | None = None,
        data_final: str | None = None,
    ) -> list[dict[str, Any]]:
        params: dict[str, str | int] = {"limite": page_size}
        if data_inicial:
            params["dataInicial"] = data_inicial
        if data_final:
            params["dataFinal"] = data_final
        return await self.list_resource("/pedidos/vendas", token_provider, params)

    @staticmethod
    def _parse_token_response(payload: dict[str, Any]) -> TokenResponse:
        return TokenResponse(
            access_token=str(payload["access_token"]),
            refresh_token=str(payload["refresh_token"]),
            expires_in=int(payload["expires_in"]),
            scope=str(payload["scope"]) if payload.get("scope") is not None else None,
        )
