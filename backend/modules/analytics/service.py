from datetime import date, timedelta
from decimal import Decimal

from backend.modules.analytics.repository import AnalyticsRepository
from backend.modules.analytics.schemas import AnalyticsDashboardResponse, SalesByPeriodResponse


class AnalyticsService:
    def __init__(self, repository: AnalyticsRepository) -> None:
        self._repository = repository

    async def get_dashboard(self, days: int = 30) -> AnalyticsDashboardResponse:
        end = date.today()
        start = end - timedelta(days=days - 1)

        total_orders = await self._repository.count_orders()
        completed_orders = await self._repository.count_completed_orders()
        revenue = Decimal(str(await self._repository.revenue()))
        average_ticket = round(revenue / completed_orders, 2) if completed_orders else None

        sales_by_period = [
            SalesByPeriodResponse(day=day, total_orders=count, revenue=Decimal(str(total)))
            for day, count, total in await self._repository.sales_by_period(start, end)
        ]

        return AnalyticsDashboardResponse(
            total_products=await self._repository.count_products(),
            active_products=await self._repository.count_active_products(),
            products_without_stock=await self._repository.count_products_without_stock(),
            total_stock=await self._repository.sum_stock(),
            total_orders=total_orders,
            orders_by_status=await self._repository.orders_by_status(),
            revenue=revenue,
            average_ticket=average_ticket,
            sales_by_period=sales_by_period,
        )
