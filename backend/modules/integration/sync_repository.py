from abc import ABC, abstractmethod
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.models.category import Category
from backend.database.models.order import Order, OrderItem
from backend.database.models.product import Product
from backend.database.models.sync import SyncLog


class ISyncLogRepository(ABC):
    @abstractmethod
    async def create(self, log: SyncLog) -> SyncLog: ...

    @abstractmethod
    async def list_recent(self, limit: int) -> list[SyncLog]: ...

    @abstractmethod
    async def find(self, log_id: str) -> SyncLog | None: ...


class PostgresSyncLogRepository(ISyncLogRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, log: SyncLog) -> SyncLog:
        self._session.add(log)
        await self._session.flush()
        return log

    async def list_recent(self, limit: int) -> list[SyncLog]:
        stmt = (
            select(SyncLog)
            .order_by(SyncLog.started_at.desc())
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def find(self, log_id: str) -> SyncLog | None:
        stmt = select(SyncLog).where(SyncLog.id == UUID(log_id))
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()


class SyncDataRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    @property
    def session(self) -> AsyncSession:
        return self._session

    async def find_product_by_bling_id(self, bling_id: str) -> Product | None:
        stmt = select(Product).where(Product.bling_id == bling_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def find_product_by_sku(self, sku: str) -> Product | None:
        stmt = select(Product).where(Product.sku == sku)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def find_category_by_bling_id(self, bling_id: str) -> Category | None:
        stmt = select(Category).where(Category.bling_id == bling_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def upsert_category(self, bling_id: str, name: str) -> Category:
        category = await self.find_category_by_bling_id(bling_id)
        if category is None:
            category = Category(bling_id=bling_id, name=name)
            self._session.add(category)
            await self._session.flush()
        else:
            category.name = name
            await self._session.flush()
        return category

    async def upsert_product(self, product: Product) -> Product:
        self._session.add(product)
        await self._session.flush()
        return product

    async def find_order_by_external_id(self, external_id: str) -> Order | None:
        stmt = select(Order).where(Order.external_id == external_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def find_order_item(self, order_id: UUID, sku: str) -> OrderItem | None:
        stmt = select(OrderItem).where(
            OrderItem.order_id == order_id,
            OrderItem.sku == sku,
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()
