from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.models.order import Order
from backend.database.models.product import Product


class AnalyticsRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def count_products(self) -> int:
        stmt = select(func.count(Product.id))
        result = await self._session.execute(stmt)
        return int(result.scalar_one())

    async def count_active_products(self) -> int:
        stmt = select(func.count(Product.id)).where(Product.active.is_(True))
        result = await self._session.execute(stmt)
        return int(result.scalar_one())

    async def count_products_without_stock(self) -> int:
        stmt = select(func.count(Product.id)).where(Product.stock_quantity <= 0)
        result = await self._session.execute(stmt)
        return int(result.scalar_one())

    async def sum_stock(self) -> int:
        stmt = select(func.coalesce(func.sum(Product.stock_quantity), 0))
        result = await self._session.execute(stmt)
        return int(result.scalar_one())

    async def count_orders(self) -> int:
        stmt = select(func.count(Order.id))
        result = await self._session.execute(stmt)
        return int(result.scalar_one())

    async def orders_by_status(self) -> dict[str, int]:
        stmt = select(Order.status, func.count(Order.id)).group_by(Order.status)
        result = await self._session.execute(stmt)
        return {status: int(count) for status, count in result.all()}

    async def revenue(self) -> float:
        stmt = select(func.coalesce(func.sum(Order.total_amount), 0)).where(
            Order.status == "completed"
        )
        result = await self._session.execute(stmt)
        return float(result.scalar_one())

    async def count_completed_orders(self) -> int:
        stmt = select(func.count(Order.id)).where(Order.status == "completed")
        result = await self._session.execute(stmt)
        return int(result.scalar_one())

    async def sales_by_period(self, start: date, end: date) -> list[tuple[date, int, float]]:
        day = func.date(Order.ordered_at)
        stmt = (
            select(day, func.count(Order.id), func.coalesce(func.sum(Order.total_amount), 0))
            .where(Order.ordered_at >= start, Order.ordered_at <= end + timedelta(days=1))
            .group_by(day)
            .order_by(day)
        )
        result = await self._session.execute(stmt)
        return [(d, int(count), float(total)) for d, count, total in result.all()]
