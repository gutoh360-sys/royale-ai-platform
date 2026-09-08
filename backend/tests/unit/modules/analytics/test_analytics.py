import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.period import BUSINESS_TZ, period_to_range

from backend.database.models.category import Category
from backend.database.models.order import Order
from backend.database.models.product import Product
from backend.modules.analytics.repository import AnalyticsRepository
from backend.modules.analytics.service import AnalyticsService


async def _category(db_session: AsyncSession) -> Category:
    category = Category(bling_id="c1", name="Categoria")
    db_session.add(category)
    await db_session.flush()
    return category


async def _product(
    db_session: AsyncSession,
    category: Category,
    *,
    sku: str,
    bling_id: str,
    stock_quantity: int = 0,
    active: bool = True,
) -> Product:
    product = Product(
        sku=sku,
        bling_id=bling_id,
        name=f"Produto {sku}",
        category_id=category.id,
        stock_quantity=stock_quantity,
        active=active,
    )
    db_session.add(product)
    await db_session.flush()
    return product


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


async def test_repository_counts_products_and_stock(db_session: AsyncSession) -> None:
    category = await _category(db_session)
    await _product(db_session, category, sku="S1", bling_id="1", stock_quantity=5)
    await _product(db_session, category, sku="S2", bling_id="2", stock_quantity=0, active=False)
    await db_session.flush()

    repo = AnalyticsRepository(db_session)
    assert await repo.count_products() == 2
    assert await repo.count_active_products() == 1
    assert await repo.count_products_without_stock() == 1
    assert await repo.sum_stock() == 5


async def test_repository_orders_kpis(db_session: AsyncSession) -> None:
    await _order(db_session, external_id="1", status="completed", total_amount=100.0)
    await _order(db_session, external_id="2", status="completed", total_amount=50.0)
    await _order(db_session, external_id="3", status="cancelled", total_amount=999.0)
    await db_session.flush()

    repo = AnalyticsRepository(db_session)
    assert await repo.count_orders() == 3
    assert await repo.orders_by_status() == {"completed": 2, "cancelled": 1}
    assert await repo.revenue() == 150.0


async def test_repository_sales_by_period(db_session: AsyncSession) -> None:
    await _order(db_session, external_id="1", status="completed", total_amount=100.0)
    await db_session.flush()

    repo = AnalyticsRepository(db_session)
    today = datetime.now(UTC).date()
    rows = await repo.sales_by_period(today, today)
    assert len(rows) == 1
    day, count, total = rows[0]
    assert day == today
    assert count == 1
    assert total == 100.0


async def test_service_dashboard_kpis(db_session: AsyncSession) -> None:
    category = await _category(db_session)
    await _product(db_session, category, sku="S1", bling_id="1", stock_quantity=5)
    await _product(db_session, category, sku="S2", bling_id="2", stock_quantity=0)
    await _order(db_session, external_id="1", status="completed", total_amount=100.0)
    await _order(db_session, external_id="2", status="completed", total_amount=50.0)
    await _order(db_session, external_id="3", status="cancelled", total_amount=10.0)
    await db_session.flush()

    service = AnalyticsService(AnalyticsRepository(db_session))
    dashboard = await service.get_dashboard(period="30d")

    assert dashboard.total_products == 2
    assert dashboard.active_products == 2
    assert dashboard.products_without_stock == 1
    assert dashboard.total_stock == 5
    assert dashboard.total_orders == 3
    assert dashboard.orders_by_status == {"completed": 2, "cancelled": 1}
    assert dashboard.revenue == Decimal("150.0")
    assert dashboard.average_ticket == Decimal("75.0")
    assert len(dashboard.sales_by_period) == 1
    assert dashboard.period == "30d"


async def test_service_dashboard_average_ticket_none_without_orders(
    db_session: AsyncSession,
) -> None:
    category = await _category(db_session)
    await _product(db_session, category, sku="S1", bling_id="1", stock_quantity=5)
    await db_session.flush()

    service = AnalyticsService(AnalyticsRepository(db_session))
    dashboard = await service.get_dashboard(period="30d")

    assert dashboard.total_orders == 0
    assert dashboard.average_ticket is None
    assert dashboard.revenue == Decimal("0")
    assert dashboard.sales_by_period == []
    assert dashboard.period == "30d"


async def test_revenue_only_counts_completed_orders(db_session: AsyncSession) -> None:
    await _order(db_session, external_id="1", status="completed", total_amount=200.0)
    await _order(db_session, external_id="2", status="pending", total_amount=150.0)
    await _order(db_session, external_id="3", status="cancelled", total_amount=999.0)
    await _order(db_session, external_id="4", status="completed", total_amount=50.0)
    await db_session.flush()

    repo = AnalyticsRepository(db_session)
    assert await repo.count_orders() == 4
    assert await repo.revenue() == 250.0
    assert await repo.count_completed_orders() == 2
    assert await repo.orders_by_status() == {
        "completed": 2,
        "pending": 1,
        "cancelled": 1,
    }


async def test_average_ticket_uses_only_completed(db_session: AsyncSession) -> None:
    await _order(db_session, external_id="1", status="completed", total_amount=100.0)
    await _order(db_session, external_id="2", status="completed", total_amount=200.0)
    await _order(db_session, external_id="3", status="pending", total_amount=500.0)
    await db_session.flush()

    service = AnalyticsService(AnalyticsRepository(db_session))
    dashboard = await service.get_dashboard(period="30d")

    assert dashboard.revenue == Decimal("300.0")
    assert dashboard.average_ticket == Decimal("150.0")
    assert dashboard.period == "30d"


async def test_sales_by_period_includes_all_statuses(db_session: AsyncSession) -> None:
    await _order(db_session, external_id="1", status="completed", total_amount=100.0)
    await _order(db_session, external_id="2", status="pending", total_amount=200.0)
    await _order(db_session, external_id="3", status="cancelled", total_amount=50.0)
    await db_session.flush()

    repo = AnalyticsRepository(db_session)
    today = datetime.now(UTC).date()
    rows = await repo.sales_by_period(today, today)
    assert len(rows) == 1
    day, count, total = rows[0]
    assert count == 3
    assert total == 350.0


async def test_dashboard_all_pending_orders(db_session: AsyncSession) -> None:
    """Simulates the current production state: all orders pending."""
    await _order(db_session, external_id="1", status="pending", total_amount=100.0)
    await _order(db_session, external_id="2", status="pending", total_amount=200.0)
    await db_session.flush()

    service = AnalyticsService(AnalyticsRepository(db_session))
    dashboard = await service.get_dashboard(period="30d")

    assert dashboard.total_orders == 2
    assert dashboard.revenue == Decimal("0")
    assert dashboard.average_ticket is None
    assert dashboard.orders_by_status == {"pending": 2}
    assert len(dashboard.sales_by_period) == 1
    assert dashboard.sales_by_period[0].revenue == Decimal("300.0")
    assert dashboard.period == "30d"


async def test_dashboard_filters_by_period(db_session: AsyncSession) -> None:
    """Orders outside the period window must NOT count toward summary metrics."""
    now = datetime.now(BUSINESS_TZ)

    # Inside 7d window
    await _order(db_session, external_id="1", status="completed", total_amount=100.0,
                 ordered_at=now - timedelta(days=2))
    await _order(db_session, external_id="2", status="completed", total_amount=50.0,
                 ordered_at=now - timedelta(days=5))

    # Outside 7d window (10 days ago)
    await _order(db_session, external_id="3", status="completed", total_amount=999.0,
                 ordered_at=now - timedelta(days=10))

    await db_session.flush()

    repo = AnalyticsRepository(db_session)
    start, end = period_to_range("7d", BUSINESS_TZ)

    total = await repo.count_orders_in_period(start, end)
    completed = await repo.count_completed_orders_in_period(start, end)
    rev = await repo.revenue_in_period(start, end)
    statuses = await repo.orders_by_status_in_period(start, end)

    assert total == 2
    assert completed == 2
    assert rev == 150.0
    assert statuses == {"completed": 2}


async def test_dashboard_zero_when_no_orders_in_period(db_session: AsyncSession) -> None:
    now = datetime.now(BUSINESS_TZ)
    await _order(db_session, external_id="1", status="completed", total_amount=100.0,
                 ordered_at=now - timedelta(days=60))
    await db_session.flush()

    repo = AnalyticsRepository(db_session)
    start, end = period_to_range("7d", BUSINESS_TZ)

    assert await repo.count_orders_in_period(start, end) == 0
    assert await repo.revenue_in_period(start, end) == 0.0


async def test_dashboard_12m_window(db_session: AsyncSession) -> None:
    now = datetime.now(BUSINESS_TZ)
    await _order(db_session, external_id="1", status="completed", total_amount=200.0,
                 ordered_at=now - timedelta(days=365))
    await _order(db_session, external_id="2", status="completed", total_amount=100.0,
                 ordered_at=now - timedelta(days=366))
    await db_session.flush()

    repo = AnalyticsRepository(db_session)
    start, end = period_to_range("12m", BUSINESS_TZ)
    total = await repo.count_orders_in_period(start, end)
    assert total == 1


async def test_service_dashboard_uses_period(db_session: AsyncSession) -> None:
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
