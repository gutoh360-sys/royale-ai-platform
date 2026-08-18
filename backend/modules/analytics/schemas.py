from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class SalesByPeriodResponse(BaseModel):
    day: date
    total_orders: int
    revenue: Decimal


class AnalyticsDashboardResponse(BaseModel):
    total_products: int
    active_products: int
    products_without_stock: int
    total_stock: int
    total_orders: int
    orders_by_status: dict[str, int]
    revenue: Decimal
    average_ticket: Decimal | None
    sales_by_period: list[SalesByPeriodResponse]
