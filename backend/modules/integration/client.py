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
                details: str | None = None
                try:
                    error_body = response.json()
                    error_info = error_body.get("error") if isinstance(error_body, dict) else None
                    if isinstance(error_info, dict):
                        parts = [
                            error_info.get("type", ""),
                            error_info.get("message", ""),
                            error_info.get("description", ""),
                        ]
                        sanitized = " - ".join(p for p in parts if p)
                        if sanitized:
                            details = sanitized
                except Exception:
                    pass
                suffix = f" ({details})" if details else ""
                raise ApiError(f"list resource failed with status {response.status_code}{suffix}")
            body = response.json()
            payload = body.get("data")
            page_item_count = 0
            if isinstance(payload, list):
                page_items = cast(list[dict[str, Any]], payload)
                items.extend(page_items)
                page_item_count = len(page_items)
            elif isinstance(payload, dict):
                items.append(payload)
                page_item_count = 1
            if max_pages is not None and page >= max_pages:
                break
            if page_item_count == 0:
                break
            if page_item_count != int(params.get("limite", 100)):
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

    async def fetch_products_page(
        self,
        token_provider: Callable[[], Awaitable[str]],
        *,
        page: int,
        page_size: int = 100,
    ) -> list[dict[str, Any]]:
        params: dict[str, str | int] = {
            "limite": page_size,
            "criterio": 2,
            "tipo": "T",
            "pagina": page,
        }
        response = await self.get_authenticated("/produtos", token_provider, params)
        if response.status_code != 200:
            raise ApiError(
                f"fetch products page {page} failed with status {response.status_code}"
            )
        body = response.json()
        payload = body.get("data")
        if isinstance(payload, list):
            return cast(list[dict[str, Any]], payload)
        return []

    async def fetch_categories(
        self,
        token_provider: Callable[[], Awaitable[str]],
    ) -> list[dict[str, Any]]:
        return await self.list_resource("/categorias/produtos", token_provider, {"limite": 100})

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

    async def fetch_channels(
        self,
        token_provider: Callable[[], Awaitable[str]],
        *,
        agrupador: int = 3,
        page_size: int = 100,
        max_pages: int | None = None,
    ) -> list[dict[str, Any]]:
        """Fetch sales channels (marketplaces) from Bling.

        agrupador 3 filters marketplace-type channels.
        """
        params: dict[str, str | int] = {"limite": page_size, "agrupador": agrupador}
        return await self.list_resource(
            "/canais-venda", token_provider, params, max_pages=max_pages
        )

    async def fetch_product_channels(
        self,
        token_provider: Callable[[], Awaitable[str]],
        *,
        page_size: int = 100,
        max_pages: int | None = None,
    ) -> list[dict[str, Any]]:
        """Fetch product-to-channel relationships from Bling."""
        return await self.list_resource(
            "/produtos/lojas", token_provider, {"limite": page_size}, max_pages=max_pages
        )

    async def fetch_listings(
        self,
        token_provider: Callable[[], Awaitable[str]],
        *,
        id_loja: str,
        tipo_integracao: str,
        page_size: int = 100,
        max_pages: int | None = None,
    ) -> list[dict[str, Any]]:
        """Fetch marketplace listings (anuncios) for a given channel.

        Bling requires both ``idLoja`` and ``tipoIntegracao``.
        """
        params: dict[str, str | int] = {
            "limite": page_size,
            "idLoja": int(id_loja),
            "tipoIntegracao": tipo_integracao,
        }
        return await self.list_resource("/anuncios", token_provider, params, max_pages=max_pages)

    async def fetch_listing_detail(
        self,
        token_provider: Callable[[], Awaitable[str]],
        *,
        listing_id: str,
        id_loja: str,
        tipo_integracao: str,
    ) -> dict[str, Any] | None:
        """Fetch a single marketplace listing detail from Bling."""
        params: dict[str, str | int] = {"idLoja": id_loja, "tipoIntegracao": tipo_integracao}
        response = await self.get_authenticated(f"/anuncios/{listing_id}", token_provider, params)
        if response.status_code != 200:
            raise ApiError(f"listing detail failed with status {response.status_code}")
        body = response.json()
        data = body.get("data")
        return cast(dict[str, Any], data) if isinstance(data, dict) else None

    async def fetch_situation(
        self,
        token_provider: Callable[[], Awaitable[str]],
        situation_id: str,
    ) -> dict[str, Any] | None:
        """Fetch a single Bling situation (status) definition."""
        response = await self.get_authenticated(f"/situacoes/{situation_id}", token_provider)
        if response.status_code != 200:
            raise ApiError(f"situation fetch failed with status {response.status_code}")
        body = response.json()
        data = body.get("data")
        return cast(dict[str, Any], data) if isinstance(data, dict) else None

    async def fetch_order(
        self,
        token_provider: Callable[[], Awaitable[str]],
        *,
        order_id: str,
    ) -> dict[str, Any] | None:
        """Fetch a single Bling sales order by ID.

        Returns the order dict on 200, None on 404, raises ApiError otherwise.
        """
        response = await self.get_authenticated(
            f"/pedidos/vendas/{order_id}", token_provider
        )
        if response.status_code == 404:
            return None
        if response.status_code != 200:
            raise ApiError(f"order fetch failed with status {response.status_code}")
        body = response.json()
        data = body.get("data")
        return cast(dict[str, Any], data) if isinstance(data, dict) else None

    @staticmethod
    def _parse_token_response(payload: dict[str, Any]) -> TokenResponse:
        return TokenResponse(
            access_token=str(payload["access_token"]),
            refresh_token=str(payload["refresh_token"]),
            expires_in=int(payload["expires_in"]),
            scope=str(payload["scope"]) if payload.get("scope") is not None else None,
        )
