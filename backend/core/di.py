from collections.abc import AsyncGenerator

from fastapi import Depends
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from backend.core.cache.redis import RedisCacheService
from backend.core.config import get_settings
from backend.core.config.base import Settings
from backend.core.ports.cache import ICacheService
from backend.core.ports.storage import IStorageBackend
from backend.core.storage.local import LocalStorage
from backend.core.storage.s3 import S3Storage
from backend.database.engine import create_engine
from backend.database.session import create_session_factory
from backend.modules.catalog.ports import ICategoryRepository, IProductRepository
from backend.modules.catalog.repository import PostgresCategoryRepository, PostgresProductRepository
from backend.modules.catalog.service import CategoryService, ProductService
from backend.modules.order.ports import IOrderRepository
from backend.modules.order.repository import PostgresOrderRepository
from backend.modules.order.service import OrderService

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


def get_cache_service(settings: Settings = Depends(get_settings)) -> ICacheService:
    return RedisCacheService(settings)


def get_storage_backend(settings: Settings = Depends(get_settings)) -> IStorageBackend:
    if settings.STORAGE_BACKEND == "s3":
        return S3Storage(settings)
    return LocalStorage(settings)


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


def get_redis_client(settings: Settings = Depends(get_settings)) -> Redis:
    return Redis.from_url(settings.REDIS_URL, decode_responses=True)


def get_product_repository(
    session: AsyncSession = Depends(get_db_session),
) -> IProductRepository:
    return PostgresProductRepository(session)


def get_category_repository(
    session: AsyncSession = Depends(get_db_session),
) -> ICategoryRepository:
    return PostgresCategoryRepository(session)


def get_order_repository(
    session: AsyncSession = Depends(get_db_session),
) -> IOrderRepository:
    return PostgresOrderRepository(session)


def get_product_service(
    repo: IProductRepository = Depends(get_product_repository),
) -> ProductService:
    return ProductService(repo)


def get_category_service(
    repo: ICategoryRepository = Depends(get_category_repository),
) -> CategoryService:
    return CategoryService(repo)


def get_order_service(
    repo: IOrderRepository = Depends(get_order_repository),
) -> OrderService:
    return OrderService(repo)
