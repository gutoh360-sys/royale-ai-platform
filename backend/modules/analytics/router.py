from fastapi import APIRouter, Depends, Query

from backend.core.security.deps import require_admin_auth
from backend.modules.analytics.di import get_analytics_service
from backend.modules.analytics.schemas import AnalyticsDashboardResponse
from backend.modules.analytics.service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get(
    "/dashboard",
    response_model=AnalyticsDashboardResponse,
    dependencies=[Depends(require_admin_auth)],
)
async def get_dashboard(
    days: int = Query(default=30, ge=1, le=365),
    service: AnalyticsService = Depends(get_analytics_service),
) -> AnalyticsDashboardResponse:
    return await service.get_dashboard(days=days)
