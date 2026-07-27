from collections.abc import AsyncGenerator

import pytest
from asgi_lifespan import LifespanManager
from httpx import ASGITransport, AsyncClient
from starlette.types import ASGIApp


@pytest.fixture
def app() -> "ASGIApp":
    from backend.main import create_app

    return create_app()


@pytest.fixture
async def client(app: "ASGIApp") -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with LifespanManager(app):
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac
