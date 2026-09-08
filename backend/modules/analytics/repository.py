from datetime import date, datetime, timedelta
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.models.category import Category
from backend.database.models.order import Order
from backend.database.models.order import OrderItem
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

    async def product_performance(self) -> list[dict]:
        revenue = func.coalesce(func.sum(OrderItem.total_price), 0)
        order_count = func.count(Order.id)
        stmt = (
            select(
                Product.id,
                Product.sku,
                Product.name,
                Product.brand,
                Product.category_id,
                Category.name.label("category_name"),
                Product.price,
                Product.cost,
                Product.stock_quantity,
                Product.active,
                revenue.label("total_revenue"),
                order_count.label("order_count"),
            )
            .outerjoin(OrderItem, OrderItem.product_id == Product.id)
            .outerjoin(
                Order,
                (OrderItem.order_id == Order.id) & (Order.status != "cancelled"),
            )
            .outerjoin(Category, Category.id == Product.category_id)
            .where(Product.active.is_(True))
            .group_by(
                Product.id,
                Product.sku,
                Product.name,
                Product.brand,
                Product.category_id,
                Category.name,
                Product.price,
                Product.cost,
                Product.stock_quantity,
                Product.active,
            )
            .order_by(revenue.desc())
        )
        result = await self._session.execute(stmt)
        return [
            {
                "id": str(row.id),
                "sku": row.sku,
                "name": row.name,
                "brand": row.brand,
                "category_id": str(row.category_id),
                "category_name": row.category_name or "Sem categoria",
                "price": float(row.price),
                "cost": float(row.cost) if row.cost else None,
                "stock_quantity": row.stock_quantity,
                "active": row.active,
                "total_revenue": float(row.total_revenue),
                "order_count": int(row.order_count),
            }
            for row in result.all()
        ]

    async def count_orders_in_period(self, start: datetime, end: datetime) -> int:
        stmt = select(func.count(Order.id)).where(
            Order.ordered_at >= start, Order.ordered_at < end
        )
        result = await self._session.execute(stmt)
        return int(result.scalar_one())

    async def count_completed_orders_in_period(self, start: datetime, end: datetime) -> int:
        stmt = select(func.count(Order.id)).where(
            Order.status == "completed",
            Order.ordered_at >= start, Order.ordered_at < end,
        )
        result = await self._session.execute(stmt)
        return int(result.scalar_one())

    async def revenue_in_period(self, start: datetime, end: datetime) -> float:
        stmt = select(func.coalesce(func.sum(Order.total_amount), 0)).where(
            Order.status == "completed",
            Order.ordered_at >= start, Order.ordered_at < end,
        )
        result = await self._session.execute(stmt)
        return float(result.scalar_one())

    async def orders_by_status_in_period(self, start: datetime, end: datetime) -> dict[str, int]:
        stmt = select(Order.status, func.count(Order.id)).where(
            Order.ordered_at >= start, Order.ordered_at < end
        ).group_by(Order.status)
        result = await self._session.execute(stmt)
        return {status: int(count) for status, count in result.all()}

    async def marketplace_revenue_in_period(
        self, start: datetime, end: datetime
    ) -> list[dict]:
        from backend.database.models.sales_channel import SalesChannel

        order_count = func.count(Order.id)
        total_amount = func.coalesce(func.sum(Order.total_amount), 0)

        stmt = (
            select(
                Order.channel_id,
                order_count.label("order_count"),
                total_amount.label("total_amount"),
            )
            .where(
                Order.status == "completed",
                Order.ordered_at >= start,
                Order.ordered_at < end,
            )
            .group_by(Order.channel_id)
            .order_by(order_count.desc())
        )
        result = await self._session.execute(stmt)
        return [
            {
                "channel_id": row.channel_id,
                "order_count": int(row.order_count),
                "total_amount": float(row.total_amount),
            }
            for row in result.all()
        ]
