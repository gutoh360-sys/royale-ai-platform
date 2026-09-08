from fastapi import APIRouter, Depends, Query

from backend.core.period import Period
from backend.core.security.deps import require_admin_auth
from backend.modules.analytics.di import get_analytics_service
from backend.modules.analytics.schemas import (
    AnalyticsDashboardResponse,
    MarketplaceRevenueResponse,
    ProductAnalyticsResponse,
)
from backend.modules.analytics.service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get(
    "/dashboard",
    response_model=AnalyticsDashboardResponse,
    dependencies=[Depends(require_admin_auth)],
)
async def get_dashboard(
    period: str = Query(default="30d"),
    days: int | None = Query(default=None, deprecated=True),
    service: AnalyticsService = Depends(get_analytics_service),
) -> AnalyticsDashboardResponse:
    if days is not None and period == "30d":
        period_map = {1: "today", 7: "7d", 30: "30d"}
        period = period_map.get(days, "30d")
    return await service.get_dashboard(period=period)


@router.get(
    "/products",
    response_model=ProductAnalyticsResponse,
    dependencies=[Depends(require_admin_auth)],
)
async def get_product_analytics(
    period: Period = Query(default="30d"),
    service: AnalyticsService = Depends(get_analytics_service),
) -> ProductAnalyticsResponse:
    return await service.get_product_analytics(period=period)


@router.get(
    "/marketplace-revenue",
    response_model=MarketplaceRevenueResponse,
    dependencies=[Depends(require_admin_auth)],
)
async def get_marketplace_revenue(
    period: str = Query(default="30d"),
    service: AnalyticsService = Depends(get_analytics_service),
) -> MarketplaceRevenueResponse:
    return await service.get_marketplace_revenue(period=period)
