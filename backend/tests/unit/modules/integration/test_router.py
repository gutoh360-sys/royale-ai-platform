from collections.abc import AsyncGenerator, Callable

import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from backend.core.config import get_settings
from backend.core.config.base import Settings
from backend.modules.integration.di import get_integration_connection_service
from backend.modules.integration.errors import OAuthStateError
from backend.modules.integration.schemas import CallbackResponse


class StubBlingService:
    def __init__(self, state_error: bool = False) -> None:
        self.state_error = state_error
        self.calls: list[dict[str, str | None]] = []

    async def handle_callback(
        self,
        code: str | None,
        state: str | None,
        error: str | None,
        error_description: str | None,
    ) -> CallbackResponse:
        self.calls.append(
            {"code": code, "state": state, "error": error, "error_description": error_description}
        )
        if self.state_error:
            raise OAuthStateError("Invalid, expired or reused OAuth state")
        if error is not None:
            return CallbackResponse(status="denied", message="Authorization was not completed")
        return CallbackResponse(status="authorized", message="Authorization completed")


def _create_app(settings: Settings) -> FastAPI:
    from backend.main import create_app

    application = create_app()
    application.dependency_overrides[get_settings] = lambda: settings
    return application


@pytest_asyncio.fixture
async def api_client(settings: Settings) -> AsyncGenerator[AsyncClient, None]:
    app = _create_app(settings)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


def _override_service(
    app: FastAPI,
    stub: Callable[[], StubBlingService],
) -> None:
    app.dependency_overrides[get_integration_connection_service] = stub


@pytest_asyncio.fixture
async def callback_client(
    settings: Settings,
) -> AsyncGenerator[tuple[AsyncClient, StubBlingService], None]:
    app = _create_app(settings)
    stub = StubBlingService()
    _override_service(app, lambda: stub)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac, stub


@pytest_asyncio.fixture
async def state_error_client(
    settings: Settings,
) -> AsyncGenerator[AsyncClient, None]:
    app = _create_app(settings)
    _override_service(app, lambda: StubBlingService(state_error=True))
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def test_authorize_route_blocked_without_admin_auth(
    api_client: AsyncClient,
) -> None:
    response = await api_client.get("/integrations/bling/authorize")
    assert response.status_code == 501


async def test_status_route_blocked_without_admin_auth(
    api_client: AsyncClient,
) -> None:
    response = await api_client.get("/integrations/bling/status")
    assert response.status_code == 501


async def test_disconnect_route_blocked_without_admin_auth(
    api_client: AsyncClient,
) -> None:
    response = await api_client.post("/integrations/bling/disconnect")
    assert response.status_code == 501


async def test_test_route_blocked_without_admin_auth(
    api_client: AsyncClient,
) -> None:
    response = await api_client.get("/integrations/bling/test")
    assert response.status_code == 501


async def test_callback_is_public_and_returns_authorized(
    callback_client: tuple[AsyncClient, StubBlingService],
) -> None:
    client, stub = callback_client
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
    callback_client: tuple[AsyncClient, StubBlingService],
) -> None:
    client, _ = callback_client
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
