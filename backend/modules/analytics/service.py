from decimal import Decimal

from backend.core.period import BUSINESS_TZ, parse_period, period_to_range
from backend.modules.analytics.repository import AnalyticsRepository
from backend.modules.analytics.schemas import (
    AnalyticsDashboardResponse,
    ProductAnalyticsResponse,
    ProductPerformanceItem,
    SalesByPeriodResponse,
)


class AnalyticsService:
    def __init__(self, repository: AnalyticsRepository) -> None:
        self._repository = repository

    async def get_dashboard(self, period: str = "30d") -> AnalyticsDashboardResponse:
        parsed = parse_period(period)
        start, end = period_to_range(parsed, BUSINESS_TZ)

        total_orders = await self._repository.count_orders_in_period(start, end)
        completed_orders = await self._repository.count_completed_orders_in_period(start, end)
        revenue = Decimal(str(await self._repository.revenue_in_period(start, end)))
        average_ticket = round(revenue / completed_orders, 2) if completed_orders else None

        sales_by_period = [
            SalesByPeriodResponse(day=day, total_orders=count, revenue=Decimal(str(total)))
            for day, count, total in await self._repository.sales_by_period(
                start.date(), end.date()
            )
        ]

        return AnalyticsDashboardResponse(
            total_products=await self._repository.count_products(),
            active_products=await self._repository.count_active_products(),
            products_without_stock=await self._repository.count_products_without_stock(),
            total_stock=await self._repository.sum_stock(),
            total_orders=total_orders,
            orders_by_status=await self._repository.orders_by_status_in_period(start, end),
            revenue=revenue,
            average_ticket=average_ticket,
            sales_by_period=sales_by_period,
            period=period,
        )

    async def get_product_analytics(self) -> ProductAnalyticsResponse:
        rows = await self._repository.product_performance()

        products = []
        for row in rows:
            price = row["price"]
            cost = row["cost"]
            revenue = row["total_revenue"]
            products.append(
                ProductPerformanceItem(
                    id=row["id"],
                    sku=row["sku"],
                    name=row["name"],
                    brand=row["brand"],
                    category_id=row["category_id"],
                    category_name=row["category_name"],
                    price=price,
                    cost=cost,
                    stock_quantity=row["stock_quantity"],
                    active=row["active"],
                    total_revenue=revenue,
                    order_count=row["order_count"],
                )
            )

        total_revenue = sum(p.total_revenue for p in products)
        total_orders = sum(p.order_count for p in products)

        margins = [
            (p.price - p.cost) / p.price * 100
            for p in products
            if p.cost and p.cost > 0 and p.price > 0
        ]
        average_margin = round(sum(margins) / len(margins), 2) if margins else None

        return ProductAnalyticsResponse(
            products=products,
            total_products=len(products),
            total_revenue=total_revenue,
            total_orders=total_orders,
            average_margin=average_margin,
        )
