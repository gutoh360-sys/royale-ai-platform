import pytest
from asgi_lifespan import LifespanManager
from httpx import ASGITransport, AsyncClient


@pytest.mark.asyncio
async def test_liveness_endpoint() -> None:
    from backend.main import create_app

    app = create_app()
    transport = ASGITransport(app=app)
    async with LifespanManager(app):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/health/liveness")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "alive"
            assert data["service"] == "royale-platform"


@pytest.mark.asyncio
async def test_startup_endpoint() -> None:
    from backend.main import create_app

    app = create_app()
    transport = ASGITransport(app=app)
    async with LifespanManager(app):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/health/startup")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "started"


@pytest.mark.asyncio
async def test_readiness_endpoint_fails_without_db() -> None:
    from backend.main import create_app

    app = create_app()
    transport = ASGITransport(app=app)
    async with LifespanManager(app):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/health/readiness")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "not_ready"
