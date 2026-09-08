import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.period import period_to_range, BUSINESS_TZ
from backend.database.models.order import Order
from backend.modules.analytics.repository import AnalyticsRepository
from backend.modules.analytics.service import AnalyticsService


async def _order(
    db_session: AsyncSession,
    *,
    external_id: str,
    status: str,
    total_amount: float,
    ordered_at: datetime | None = None,
) -> Order:
    order = Order(
        id=uuid.uuid4(),
        external_id=external_id,
        marketplace="bling",
        order_number=external_id,
        customer_name="Cliente",
        status=status,
        total_amount=total_amount,
        ordered_at=ordered_at or datetime.now(UTC),
    )
    db_session.add(order)
    await db_session.flush()
    return order


async def test_today_filters_correctly(db_session: AsyncSession) -> None:
    now = datetime.now(BUSINESS_TZ)
    await _order(db_session, external_id="1", status="completed", total_amount=100.0,
                 ordered_at=now)
    await _order(db_session, external_id="2", status="completed", total_amount=200.0,
                 ordered_at=now - timedelta(days=2))
    await db_session.flush()

    repo = AnalyticsRepository(db_session)
    start, end = period_to_range("today", BUSINESS_TZ)
    total = await repo.count_orders_in_period(start, end)
    assert total == 1


async def test_7d_filters_correctly(db_session: AsyncSession) -> None:
    now = datetime.now(BUSINESS_TZ)
    await _order(db_session, external_id="1", status="completed", total_amount=100.0,
                 ordered_at=now - timedelta(days=3))
    await _order(db_session, external_id="2", status="completed", total_amount=200.0,
                 ordered_at=now - timedelta(days=10))
    await db_session.flush()

    repo = AnalyticsRepository(db_session)
    start, end = period_to_range("7d", BUSINESS_TZ)
    total = await repo.count_orders_in_period(start, end)
    assert total == 1


async def test_12m_filters_correctly(db_session: AsyncSession) -> None:
    now = datetime.now(BUSINESS_TZ)
    await _order(db_session, external_id="1", status="completed", total_amount=100.0,
                 ordered_at=now - timedelta(days=300))
    await _order(db_session, external_id="2", status="completed", total_amount=200.0,
                 ordered_at=now - timedelta(days=400))
    await db_session.flush()

    repo = AnalyticsRepository(db_session)
    start, end = period_to_range("12m", BUSINESS_TZ)
    total = await repo.count_orders_in_period(start, end)
    assert total == 1


async def test_revenue_only_counts_completed(db_session: AsyncSession) -> None:
    now = datetime.now(BUSINESS_TZ)
    await _order(db_session, external_id="1", status="completed", total_amount=100.0,
                 ordered_at=now - timedelta(days=1))
    await _order(db_session, external_id="2", status="pending", total_amount=200.0,
                 ordered_at=now - timedelta(days=1))
    await _order(db_session, external_id="3", status="cancelled", total_amount=300.0,
                 ordered_at=now - timedelta(days=1))
    await db_session.flush()

    repo = AnalyticsRepository(db_session)
    start, end = period_to_range("7d", BUSINESS_TZ)
    rev = await repo.revenue_in_period(start, end)
    assert rev == 100.0


async def test_zero_when_no_orders(db_session: AsyncSession) -> None:
    repo = AnalyticsRepository(db_session)
    start, end = period_to_range("7d", BUSINESS_TZ)
    total = await repo.count_orders_in_period(start, end)
    rev = await repo.revenue_in_period(start, end)
    assert total == 0
    assert rev == 0.0


async def test_service_dashboard_with_period(db_session: AsyncSession) -> None:
    now = datetime.now(BUSINESS_TZ)
    await _order(db_session, external_id="1", status="completed", total_amount=100.0,
                 ordered_at=now - timedelta(days=2))
    await _order(db_session, external_id="2", status="completed", total_amount=500.0,
                 ordered_at=now - timedelta(days=40))
    await db_session.flush()

    service = AnalyticsService(AnalyticsRepository(db_session))
    dashboard = await service.get_dashboard(period="7d")

    assert dashboard.total_orders == 1
    assert dashboard.revenue == Decimal("100.0")
    assert dashboard.average_ticket == Decimal("100.0")
    assert dashboard.period == "7d"
