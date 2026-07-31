from collections.abc import AsyncGenerator

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from backend.core.cache.redis import RedisCacheService
from backend.core.config import get_settings
from backend.core.config.base import Settings
from backend.core.ports.cache import ICacheService
from backend.core.security.encryption import EncryptionService
from backend.database.engine import create_engine
from backend.database.session import create_session_factory
from backend.modules.integration.client import BlingApiClient
from backend.modules.integration.ports import IBlingConnectionRepository
from backend.modules.integration.repository import PostgresIntegrationConnectionRepository
from backend.modules.integration.service import IntegrationConnectionService
from backend.modules.integration.state import OAuthStateService

_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def _get_engine(settings: Settings) -> AsyncEngine:
    global _engine
    if _engine is None:
        _engine = create_engine(settings)
    return _engine


def _get_session_factory(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    global _session_factory
    if _session_factory is None:
        _session_factory = create_session_factory(engine)
    return _session_factory


async def get_db_session(
    settings: Settings = Depends(get_settings),
) -> AsyncGenerator[AsyncSession, None]:
    engine = _get_engine(settings)
    factory = _get_session_factory(engine)
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


def get_cache_service(settings: Settings = Depends(get_settings)) -> ICacheService:
    return RedisCacheService(settings)


def get_encryption_service(settings: Settings = Depends(get_settings)) -> EncryptionService:
    return EncryptionService(settings.ENCRYPTION_KEY)


def get_bling_connection_repository(
    session: AsyncSession = Depends(get_db_session),
) -> IBlingConnectionRepository:
    return PostgresIntegrationConnectionRepository(session)


def get_oauth_state_service(
    cache: ICacheService = Depends(get_cache_service),
    settings: Settings = Depends(get_settings),
) -> OAuthStateService:
    return OAuthStateService(cache, settings.BLING_OAUTH_STATE_TTL_SECONDS)


async def get_bling_api_client(
    settings: Settings = Depends(get_settings),
) -> AsyncGenerator[BlingApiClient, None]:
    client = BlingApiClient(settings)
    try:
        yield client
    finally:
        await client.aclose()


def get_integration_connection_service(
    repo: IBlingConnectionRepository = Depends(get_bling_connection_repository),
    state: OAuthStateService = Depends(get_oauth_state_service),
    client: BlingApiClient = Depends(get_bling_api_client),
    crypto: EncryptionService = Depends(get_encryption_service),
    settings: Settings = Depends(get_settings),
) -> IntegrationConnectionService:
    return IntegrationConnectionService(
        repo=repo, state=state, client=client, crypto=crypto, settings=settings
    )
