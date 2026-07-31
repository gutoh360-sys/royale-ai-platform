import logging
from collections.abc import AsyncGenerator, AsyncIterator, Callable
from contextlib import asynccontextmanager

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from backend.core.config import get_settings
from backend.core.config.base import Settings
from backend.modules.integration.di import get_integration_connection_service
from backend.modules.integration.errors import OAuthStateError
from backend.modules.integration.service import (
    AuthorizationURL,
    CallbackResult,
    ConnectionStatus,
    ConnectionTestResult,
)

ADMIN_USERNAME = "royale-admin"
ADMIN_PASSWORD = "test-admin-password"
ADMIN_AUTH = (ADMIN_USERNAME, ADMIN_PASSWORD)


class StubBlingService:
    def __init__(self, state_error: bool = False) -> None:
        self.state_error = state_error
        self.calls: list[dict[str, str | None]] = []
        self.action_calls: list[str] = []

    async def build_authorization_url(self) -> AuthorizationURL:
        self.action_calls.append("authorize")
        return AuthorizationURL(url="https://bling.example/authorize?state=test-state")

    async def handle_callback(
        self,
        code: str | None,
        state: str | None,
        error: str | None,
        error_description: str | None,
    ) -> CallbackResult:
        self.calls.append(
            {"code": code, "state": state, "error": error, "error_description": error_description}
        )
        if self.state_error:
            raise OAuthStateError("Invalid, expired or reused OAuth state")
        if error is not None:
            return CallbackResult(status="denied", message="Authorization was not completed")
        return CallbackResult(status="authorized", message="Authorization completed")

    async def get_status(self) -> ConnectionStatus:
        self.action_calls.append("status")
        return ConnectionStatus(
            provider="bling",
            status="active",
            connected=True,
            last_authenticated_at=None,
            scopes=["produtos"],
        )

    async def disconnect(self) -> None:
        self.action_calls.append("disconnect")

    async def test_connection(self) -> ConnectionTestResult:
        self.action_calls.append("test")
        return ConnectionTestResult(status="ok", detail="Bling connection is working")


def _create_app(settings: Settings) -> FastAPI:
    from backend.main import create_app

    application = create_app()
    application.dependency_overrides[get_settings] = lambda: settings
    return application


@asynccontextmanager
async def _client_for(
    settings: Settings,
    stub: StubBlingService | None = None,
) -> AsyncIterator[AsyncClient]:
    app = _create_app(settings)
    if stub is not None:
        _override_service(app, lambda: stub)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


def _override_service(
    app: FastAPI,
    stub: Callable[[], StubBlingService],
) -> None:
    app.dependency_overrides[get_integration_connection_service] = stub


@pytest_asyncio.fixture
async def router_client(
    settings: Settings,
) -> AsyncGenerator[tuple[AsyncClient, StubBlingService], None]:
    stub = StubBlingService()
    async with _client_for(settings, stub) as ac:
        yield ac, stub


@pytest_asyncio.fixture
async def state_error_client(
    settings: Settings,
) -> AsyncGenerator[AsyncClient, None]:
    async with _client_for(settings, StubBlingService(state_error=True)) as ac:
        yield ac


async def test_authorize_without_auth_returns_401_with_basic_challenge(
    router_client: tuple[AsyncClient, StubBlingService],
) -> None:
    client, _ = router_client
    response = await client.get("/integrations/bling/authorize")

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Basic"


async def test_authorize_with_wrong_username_returns_generic_401(
    router_client: tuple[AsyncClient, StubBlingService],
) -> None:
    client, _ = router_client
    response = await client.get(
        "/integrations/bling/authorize", auth=("wrong-user", ADMIN_PASSWORD)
    )

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Basic"
    assert "wrong-user" not in response.text
    assert ADMIN_PASSWORD not in response.text


async def test_authorize_with_wrong_password_returns_same_generic_401(
    router_client: tuple[AsyncClient, StubBlingService],
) -> None:
    client, _ = router_client
    wrong_user = await client.get(
        "/integrations/bling/authorize", auth=("wrong-user", ADMIN_PASSWORD)
    )
    wrong_password = await client.get(
        "/integrations/bling/authorize", auth=(ADMIN_USERNAME, "wrong-password")
    )

    assert wrong_password.status_code == 401
    assert wrong_password.headers["WWW-Authenticate"] == "Basic"
    assert wrong_password.json()["detail"] == wrong_user.json()["detail"]
    assert "wrong-password" not in wrong_password.text


async def test_authorize_with_valid_credentials_preserves_response_contract(
    router_client: tuple[AsyncClient, StubBlingService],
) -> None:
    client, stub = router_client
    response = await client.get("/integrations/bling/authorize", auth=ADMIN_AUTH)

    assert response.status_code == 200
    assert response.json() == {
        "authorization_url": "https://bling.example/authorize?state=test-state"
    }
    assert stub.action_calls == ["authorize"]


async def test_status_without_auth_returns_401(
    router_client: tuple[AsyncClient, StubBlingService],
) -> None:
    client, _ = router_client

    response = await client.get("/integrations/bling/status")

    assert response.status_code == 401


async def test_status_with_authentication_works(
    router_client: tuple[AsyncClient, StubBlingService],
) -> None:
    client, stub = router_client

    response = await client.get("/integrations/bling/status", auth=ADMIN_AUTH)

    assert response.status_code == 200
    assert response.json()["status"] == "active"
    assert stub.action_calls == ["status"]


async def test_disconnect_without_auth_returns_401(
    router_client: tuple[AsyncClient, StubBlingService],
) -> None:
    client, _ = router_client

    response = await client.post("/integrations/bling/disconnect")

    assert response.status_code == 401


async def test_disconnect_with_authentication_works(
    router_client: tuple[AsyncClient, StubBlingService],
) -> None:
    client, stub = router_client

    response = await client.post("/integrations/bling/disconnect", auth=ADMIN_AUTH)

    assert response.status_code == 200
    assert stub.action_calls == ["disconnect", "status"]


async def test_connection_test_without_auth_returns_401(
    router_client: tuple[AsyncClient, StubBlingService],
) -> None:
    client, _ = router_client

    response = await client.get("/integrations/bling/test")

    assert response.status_code == 401


async def test_connection_test_with_authentication_works(
    router_client: tuple[AsyncClient, StubBlingService],
) -> None:
    client, stub = router_client

    response = await client.get("/integrations/bling/test", auth=ADMIN_AUTH)

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert stub.action_calls == ["test"]


async def test_callback_is_public_and_returns_authorized(
    router_client: tuple[AsyncClient, StubBlingService],
) -> None:
    client, stub = router_client
    response = await client.get(
        "/integrations/bling/callback",
        params={"code": "the-code", "state": "the-state"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "authorized"
    assert "token" not in str(body).lower()
    expected_call = {
        "code": "the-code",
        "state": "the-state",
        "error": None,
        "error_description": None,
    }
    assert stub.calls == [expected_call]


async def test_callback_with_user_denial_returns_denied(
    router_client: tuple[AsyncClient, StubBlingService],
) -> None:
    client, _ = router_client
    response = await client.get(
        "/integrations/bling/callback",
        params={"error": "access_denied", "error_description": "user denied"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "denied"


async def test_callback_state_error_maps_to_400(state_error_client: AsyncClient) -> None:
    response = await state_error_client.get(
        "/integrations/bling/callback",
        params={"code": "c", "state": "stale-state"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid, expired or reused OAuth state"


async def test_invalid_credentials_are_not_logged(
    router_client: tuple[AsyncClient, StubBlingService],
    caplog: pytest.LogCaptureFixture,
) -> None:
    client, _ = router_client
    username = "private-admin-user"
    password = "private-admin-password"

    with caplog.at_level(logging.DEBUG):
        response = await client.get("/integrations/bling/authorize", auth=(username, password))

    assert response.status_code == 401
    assert username not in caplog.text
    assert password not in caplog.text


@pytest.mark.parametrize("missing_field", ["BLING_ADMIN_USERNAME", "BLING_ADMIN_PASSWORD"])
async def test_missing_production_credentials_fail_closed(
    settings: Settings,
    missing_field: str,
) -> None:
    production = settings.model_copy(update={"ENVIRONMENT": "prod", missing_field: ""})

    async with _client_for(production, StubBlingService()) as client:
        response = await client.get("/integrations/bling/authorize", auth=ADMIN_AUTH)

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Basic"


async def test_empty_authorization_header_does_not_bypass_authentication(
    router_client: tuple[AsyncClient, StubBlingService],
) -> None:
    client, _ = router_client

    response = await client.get("/integrations/bling/authorize", headers={"Authorization": ""})

    assert response.status_code == 401


async def test_whitespace_configuration_fails_closed(settings: Settings) -> None:
    misconfigured = settings.model_copy(
        update={"BLING_ADMIN_USERNAME": " royale-admin ", "BLING_ADMIN_PASSWORD": "   "}
    )

    async with _client_for(misconfigured, StubBlingService()) as client:
        response = await client.get("/integrations/bling/authorize", auth=ADMIN_AUTH)

    assert response.status_code == 401


async def test_very_long_password_is_supported(settings: Settings) -> None:
    long_password = "a9!" * 2048
    configured = settings.model_copy(update={"BLING_ADMIN_PASSWORD": long_password})

    async with _client_for(configured, StubBlingService()) as client:
        response = await client.get(
            "/integrations/bling/authorize", auth=(ADMIN_USERNAME, long_password)
        )

    assert response.status_code == 200


async def test_embedded_space_in_password_is_supported(settings: Settings) -> None:
    password = "correct horse battery staple"
    configured = settings.model_copy(update={"BLING_ADMIN_PASSWORD": password})

    async with _client_for(configured, StubBlingService()) as client:
        response = await client.get(
            "/integrations/bling/authorize", auth=(ADMIN_USERNAME, password)
        )

    assert response.status_code == 200


async def test_special_characters_are_supported(settings: Settings) -> None:
    username = "admin+ops@example.com"
    password = "P@$$w0rd:!#%&*()[]{}?"
    configured = settings.model_copy(
        update={"BLING_ADMIN_USERNAME": username, "BLING_ADMIN_PASSWORD": password}
    )

    async with _client_for(configured, StubBlingService()) as client:
        response = await client.get("/integrations/bling/authorize", auth=(username, password))

    assert response.status_code == 200
