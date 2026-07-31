from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.models.order import Order
from backend.modules.order.ports import IOrderRepository


class PostgresOrderRepository(IOrderRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def find_all(self, status: str | None = None) -> list[Order]:
        stmt = select(Order)
        if status is not None:
            stmt = stmt.where(Order.status == status)
        stmt = stmt.order_by(Order.created_at, Order.id)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def find_by_id(self, order_id: str) -> Order | None:
        stmt = select(Order).where(Order.id == UUID(order_id))
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def find_by_external_id(self, external_id: str, marketplace: str) -> Order | None:
        stmt = select(Order).where(
            Order.external_id == external_id,
            Order.marketplace == marketplace,
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def save(self, order: Order) -> Order:
        self._session.add(order)
        await self._session.flush()
        await self._session.refresh(order)
        return order

    async def update_status(self, order_id: str, status: str) -> None:
        stmt = select(Order).where(Order.id == UUID(order_id))
        result = await self._session.execute(stmt)
        order = result.scalar_one_or_none()
        if order is not None:
            order.status = status
            await self._session.flush()
