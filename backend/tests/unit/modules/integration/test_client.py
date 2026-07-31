import base64
from collections.abc import Callable
from typing import Any

import httpx
import pytest

from backend.core.config.base import Settings
from backend.modules.integration.client import BlingApiClient, redact_url
from backend.modules.integration.errors import (
    ApiError,
    OAuthExchangeError,
    OAuthRefreshError,
    TokenRevocationError,
)


def _token_json(
    access: str = "jwt-access",
    refresh: str = "jwt-refresh",
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


def _basic(settings: Settings) -> str:
    raw = f"{settings.BLING_CLIENT_ID}:{settings.BLING_CLIENT_SECRET}".encode()
    return "Basic " + base64.b64encode(raw).decode()


def _make_client(
    settings: Settings,
    handler: Callable[[httpx.Request], httpx.Response],
) -> BlingApiClient:
    transport = httpx.MockTransport(handler)
    http = httpx.AsyncClient(transport=transport, timeout=httpx.Timeout(1.0))
    return BlingApiClient(settings, client=http)


async def test_exchange_code_sends_expected_request(
    settings: Settings,
) -> None:
    captured: dict[str, Any] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["headers"] = request.headers
        captured["body"] = request.read().decode()
        return httpx.Response(200, json=_token_json())

    client = _make_client(settings, handler)
    tokens = await client.exchange_code("the-code")

    assert captured["url"] == settings.BLING_TOKEN_URL
    assert captured["headers"]["Authorization"] == _basic(settings)
    assert captured["headers"]["enable-jwt"] == "1"
    assert captured["headers"]["Content-Type"] == "application/x-www-form-urlencoded"
    assert "grant_type=authorization_code" in captured["body"]
    assert "code=the-code" in captured["body"]
    assert tokens.access_token == "jwt-access"
    assert tokens.refresh_token == "jwt-refresh"
    assert tokens.expires_in == 3600
    assert tokens.scope == "a.b.c"


async def test_exchange_code_failure_raises_and_does_not_retry(
    settings: Settings,
) -> None:
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(400, json={"error": "invalid_grant"})

    client = _make_client(settings, handler)
    with pytest.raises(OAuthExchangeError) as exc_info:
        await client.exchange_code("the-code")

    assert exc_info.value.status_code == 400
    assert calls == 1


async def test_refresh_sends_refresh_grant(settings: Settings) -> None:
    captured: dict[str, Any] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["body"] = request.read().decode()
        captured["headers"] = request.headers
        return httpx.Response(200, json=_token_json(access="refreshed-access"))

    client = _make_client(settings, handler)
    tokens = await client.refresh_token("old-refresh")

    assert "grant_type=refresh_token" in captured["body"]
    assert "refresh_token=old-refresh" in captured["body"]
    assert captured["headers"]["enable-jwt"] == "1"
    assert captured["headers"]["Authorization"] == _basic(settings)
    assert tokens.access_token == "refreshed-access"


async def test_refresh_failure_raises_with_status_and_no_retry(
    settings: Settings,
) -> None:
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(500, json={})

    client = _make_client(settings, handler)
    with pytest.raises(OAuthRefreshError) as exc_info:
        await client.refresh_token("old-refresh")

    assert exc_info.value.status_code == 500
    assert calls == 1


async def test_revoke_sends_basic_and_form(settings: Settings) -> None:
    captured: dict[str, Any] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["headers"] = request.headers
        captured["body"] = request.read().decode()
        return httpx.Response(204)

    client = _make_client(settings, handler)
    await client.revoke_token("the-token", "refresh_token")

    assert captured["url"] == settings.BLING_REVOKE_URL
    assert captured["headers"]["Authorization"] == _basic(settings)
    assert captured["headers"]["Content-Type"] == "application/x-www-form-urlencoded"
    assert "token=the-token" in captured["body"]
    assert "token_type_hint=refresh_token" in captured["body"]


async def test_revoke_failure_raises(settings: Settings) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(503, json={})

    client = _make_client(settings, handler)
    with pytest.raises(TokenRevocationError):
        await client.revoke_token("the-token", "refresh_token")


async def test_get_authenticated_uses_bearer_and_enable_jwt(settings: Settings) -> None:
    captured: dict[str, Any] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["headers"] = request.headers
        return httpx.Response(200, json={})

    client = _make_client(settings, handler)
    await client.get_authenticated("/produtos?limite=1", _token_provider("jwt-access"))

    assert captured["url"] == "https://api.bling.com.br/Api/v3/produtos?limite=1"
    assert captured["headers"]["Authorization"] == "Bearer jwt-access"
    assert captured["headers"]["enable-jwt"] == "1"


async def test_get_authenticated_refreshes_once_after_401(settings: Settings) -> None:
    auth_headers: list[str] = []
    provider_calls = 0

    async def provider() -> str:
        nonlocal provider_calls
        provider_calls += 1
        return f"token-{provider_calls}"

    def handler(request: httpx.Request) -> httpx.Response:
        auth_headers.append(str(request.headers.get("Authorization")))
        if len(auth_headers) == 1:
            return httpx.Response(401, json={})
        return httpx.Response(200, json={})

    client = _make_client(settings, handler)
    response = await client.get_authenticated("/produtos?limite=1", provider)

    assert response.status_code == 200
    assert provider_calls == 2
    assert auth_headers == ["Bearer token-1", "Bearer token-2"]


async def test_get_authenticated_second_401_returns_response(settings: Settings) -> None:
    calls = 0

    async def provider() -> str:
        nonlocal calls
        calls += 1
        return f"token-{calls}"

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={})

    client = _make_client(settings, handler)
    response = await client.get_authenticated("/produtos?limite=1", provider)

    assert response.status_code == 401
    assert calls == 2


async def test_get_authenticated_respects_retry_after_on_429(settings: Settings) -> None:
    calls = 0

    async def provider() -> str:
        return "token"

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        if calls == 1:
            return httpx.Response(429, headers={"Retry-After": "0"}, json={})
        return httpx.Response(200, json={})

    client = _make_client(settings, handler)
    response = await client.get_authenticated("/produtos?limite=1", provider)

    assert response.status_code == 200
    assert calls == 2


async def test_get_authenticated_retries_bounded_on_5xx(settings: Settings) -> None:
    calls = 0

    async def provider() -> str:
        return "token"

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(503, json={})

    client = _make_client(settings, handler)
    response = await client.get_authenticated("/produtos?limite=1", provider)

    assert response.status_code == 503
    assert calls == settings.BLING_MAX_RETRIES + 1


async def test_get_authenticated_other_4xx_raises_immediately(settings: Settings) -> None:
    calls = 0

    async def provider() -> str:
        return "token"

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(422, json={})

    client = _make_client(settings, handler)
    response = await client.get_authenticated("/produtos?limite=1", provider)

    assert response.status_code == 422
    assert calls == 1


async def test_network_error_sanitized(settings: Settings) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectTimeout("connection timed out", request=request)

    client = _make_client(settings, handler)
    with pytest.raises(ApiError) as exc_info:
        await client.get_authenticated("/produtos?limite=1", _token_provider("token"))

    message = str(exc_info.value)
    assert "ConnectTimeout" in message
    assert "https://api.bling.com.br/Api/v3/produtos" in message
    assert "token" not in message


def test_redact_url_strips_query_and_fragment() -> None:
    assert redact_url("https://api.bling.com.br/Api/v3/produtos?limite=1") == (
        "https://api.bling.com.br/Api/v3/produtos"
    )
    assert redact_url("https://api.bling.com.br/oauth/token?code=SECRET&state=SECRET") == (
        "https://api.bling.com.br/oauth/token"
    )


def _token_provider(token: str) -> Callable[[], Any]:
    async def provider() -> str:
        return token

    return provider
