from collections.abc import AsyncGenerator
from typing import Any

import pytest
import pytest_asyncio
from asgi_lifespan import LifespanManager
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend.core.config.base import Settings
from backend.database.base import Base


@pytest.fixture(scope="session")
def settings() -> Settings:
    return Settings(
        ENVIRONMENT="test",
        DEBUG=True,
        DATABASE_URL="sqlite+aiosqlite:///./test.db",
        REDIS_URL="redis://localhost:6379/0",
        STORAGE_BACKEND="local",
        STORAGE_LOCAL_PATH="./test_storage",
        ENCRYPTION_KEY="dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1jaGFycy0tLS0=",
        JWT_SECRET_KEY="test-jwt-secret-key",
        AI_GATEWAY_API_KEY="test-ai-gateway-key",
        CORS_ORIGINS=["*"],
    )


@pytest_asyncio.fixture(scope="function")
async def db_session(settings: Settings) -> AsyncGenerator[AsyncSession, Any]:
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def client(settings: Settings) -> AsyncGenerator[AsyncClient, Any]:
    from backend.main import create_app

    app = create_app()
    transport = ASGITransport(app=app)
    async with LifespanManager(app):
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac
