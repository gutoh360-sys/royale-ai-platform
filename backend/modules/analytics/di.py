from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.di import get_db_session
from backend.modules.analytics.repository import AnalyticsRepository
from backend.modules.analytics.service import AnalyticsService


def get_analytics_repository(
    session: AsyncSession = Depends(get_db_session),
) -> AnalyticsRepository:
    return AnalyticsRepository(session)


def get_analytics_service(
    repository: AnalyticsRepository = Depends(get_analytics_repository),
) -> AnalyticsService:
    return AnalyticsService(repository)
