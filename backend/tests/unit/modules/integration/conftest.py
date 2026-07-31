from collections.abc import AsyncGenerator, Generator
from typing import Any

import pytest
import pytest_asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from testcontainers.community.postgres import PostgresContainer
from testcontainers.community.redis import RedisContainer

from backend.core.cache.redis import RedisCacheService
from backend.core.config.base import Settings
from backend.core.ports.cache import ICacheService
from backend.core.security.encryption import EncryptionService
from backend.database.base import Base


@pytest.fixture
def settings() -> Settings:
    return Settings(
        ENVIRONMENT="test",
        DEBUG=True,
        DATABASE_URL="sqlite+aiosqlite:///./test.db",
        REDIS_URL="redis://localhost:6379/0",
        ENCRYPTION_KEY="dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1jaGFycy0tLS0=",
        BLING_CLIENT_ID="test-client-id",
        BLING_CLIENT_SECRET="test-client-secret",
        BLING_REDIRECT_URI="http://test/bling/callback",
        BLING_API_BASE_URL="https://api.bling.com.br/Api/v3",
        BLING_AUTHORIZE_URL="https://bling.com.br/Api/v3/oauth/authorize",
        BLING_TOKEN_URL="https://api.bling.com.br/oauth/token",
        BLING_REVOKE_URL="https://api.bling.com.br/oauth/revoke",
        BLING_MAX_REQUESTS_PER_SECOND=1000.0,
        BLING_MAX_BACKOFF_SECONDS=1.0,
    )


@pytest.fixture
def crypto(settings: Settings) -> EncryptionService:
    return EncryptionService(settings.ENCRYPTION_KEY)


class FakeCache(ICacheService):
    def __init__(self) -> None:
        self._data: dict[str, str] = {}

    async def get(self, key: str) -> Any | None:
        return self._data.get(key)

    async def set(self, key: str, value: Any, ttl: int = 300) -> None:
        self._data[key] = str(value)

    async def delete(self, pattern: str) -> None:
        for key in list(self._data):
            if _matches(pattern, key):
                del self._data[key]

    async def exists(self, key: str) -> bool:
        return key in self._data

    async def consume(self, key: str) -> str | None:
        value = self._data.pop(key, None)
        return value


def _matches(pattern: str, value: str) -> bool:
    import fnmatch

    return fnmatch.fnmatch(value, pattern)


@pytest.fixture
def fake_cache() -> FakeCache:
    return FakeCache()


@pytest.fixture(scope="session")
def pg_container() -> Generator[PostgresContainer, None, None]:
    with PostgresContainer("postgres:16-alpine") as pg:
        yield pg


@pytest_asyncio.fixture
async def pg_engine(pg_container: PostgresContainer) -> AsyncGenerator[AsyncEngine, None]:
    url = (
        pg_container.get_connection_url()
        .replace("+psycopg2", "")
        .replace("postgresql://", "postgresql+asyncpg://")
    )
    engine = create_async_engine(url)
    async with engine.begin() as conn:
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS operational"))
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(pg_engine: AsyncEngine) -> AsyncGenerator[AsyncSession, None]:
    session_factory = async_sessionmaker(pg_engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def session_factory(
    pg_engine: AsyncEngine,
) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(pg_engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(scope="session")
def redis_container() -> Generator[RedisContainer, None, None]:
    with RedisContainer("redis:7-alpine") as redis:
        yield redis


@pytest_asyncio.fixture
async def redis_cache(redis_container: RedisContainer) -> AsyncGenerator[RedisCacheService, None]:
    url = (
        f"redis://{redis_container.get_container_host_ip()}:"
        f"{redis_container.get_exposed_port(6379)}/0"
    )
    settings = Settings(
        REDIS_URL=url,
        ENCRYPTION_KEY="dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1jaGFycy0tLS0=",
    )
    cache = RedisCacheService(settings)
    yield cache
    await cache.delete("oauth:state:*")
    await cache.aclose()
