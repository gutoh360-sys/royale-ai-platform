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
    period: str


class ProductPerformanceItem(BaseModel):
    quantity: int = 0
    margin: float | None = None
    cost_coverage: float | None = None
    growth: float | None = None
    id: str
    sku: str
    name: str
    brand: str | None
    category_id: str
    category_name: str
    price: float
    cost: float | None
    stock_quantity: int
    active: bool
    total_revenue: float
    order_count: int


class MarketplaceRevenueItem(BaseModel):
    channel_id: str | None
    channel_name: str
    marketplace_slug: str
    total_orders: int
    total_revenue: float
    average_ticket: float


class MarketplaceRevenueResponse(BaseModel):
    marketplaces: list[MarketplaceRevenueItem]
    total_orders: int
    total_revenue: float
    period: str


class ProductAnalyticsResponse(BaseModel):
    period: str = "30d"
    quantity: int = 0
    cost_coverage: float | None = None
    growth: float | None = None
    eligible_orders: int = 0
    orders_with_items: int = 0
    coverage: float | None = None
    top_sku: str | None = None
    top10: list[ProductPerformanceItem] = []
    sold_out: list[ProductPerformanceItem] = []
    products: list[ProductPerformanceItem]
    total_products: int
    total_revenue: float
    total_orders: int
    average_margin: float | None
