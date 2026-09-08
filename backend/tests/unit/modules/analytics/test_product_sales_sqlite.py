from datetime import UTC, datetime, timedelta
from unittest.mock import patch
from uuid import uuid4

import pytest
from sqlalchemy import insert
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.ext.compiler import compiles

from backend.database.models.category import Category
from backend.database.models.order import Order, OrderItem
from backend.database.models.product import Product
from backend.modules.analytics.repository import AnalyticsRepository
from backend.modules.analytics.service import AnalyticsService
from backend.modules.integration.sync_repository import SyncDataRepository


@compiles(JSONB, "sqlite")
def jsonb_sqlite(type_, compiler, **kw):
    return "JSON"


@pytest.mark.asyncio
async def test_real_sql_sales_distinct_pending_cancelled_dates_margin_coverage_growth():
    engine = create_async_engine(
        "sqlite+aiosqlite://", execution_options={"schema_translate_map": {"operational": None}}
    )
    start = datetime(2026, 9, 1, 3, tzinfo=UTC)
    end = start + timedelta(days=1)
    cat, p1, p2 = uuid4(), uuid4(), uuid4()
    async with engine.begin() as conn:
        for table in (Category.__table__, Product.__table__, Order.__table__, OrderItem.__table__):
            await conn.run_sync(table.create)
        await conn.execute(insert(Category).values(id=cat, name="Test", bling_id="cat"))
        await conn.execute(
            insert(Product),
            [
                dict(
                    id=p1,
                    sku="A",
                    bling_id="1",
                    name="A",
                    category_id=cat,
                    price=999,
                    cost=10,
                    stock_quantity=0,
                ),
                dict(
                    id=p2,
                    sku="B",
                    bling_id="2",
                    name="B",
                    category_id=cat,
                    price=999,
                    cost=0,
                    stock_quantity=5,
                ),
            ],
        )
        for i, (status, date, lines) in enumerate(
            [
                ("pending", start, [(p1, 2, 100), (p2, 3, 60)]),
                ("completed", start, [(p1, 1, 50)]),
                ("cancelled", start, [(p1, 100, 9000)]),
                ("pending", start, []),
                ("completed", start - timedelta(hours=1), [(p1, 1, 75)]),
                ("completed", end, [(p1, 100, 9000)]),
            ]
        ):
            oid = uuid4()
            await conn.execute(
                insert(Order).values(
                    id=oid,
                    external_id=str(i),
                    order_number=str(i),
                    customer_name="Synthetic",
                    status=status,
                    ordered_at=date,
                    created_at=end + timedelta(days=10),
                )
            )
            for pid, qty, revenue in lines:
                await conn.execute(
                    insert(OrderItem).values(
                        id=uuid4(),
                        order_id=oid,
                        product_id=pid,
                        sku=str(pid),
                        product_name="Test",
                        quantity=qty,
                        unit_price=1,
                        total_price=revenue,
                    )
                )
    async with AsyncSession(engine) as session:
        svc = AnalyticsService(AnalyticsRepository(session))
        with patch("backend.modules.analytics.service.period_to_range", return_value=(start, end)):
            result = await svc.get_product_analytics("today")
        assert result.total_revenue == 210
        assert result.quantity == 6
        assert result.total_orders == 2
        assert result.eligible_orders == 3
        assert result.coverage == pytest.approx(2 / 3)
        assert result.average_margin == 80
        assert result.cost_coverage == pytest.approx(150 / 210)
        assert result.growth == 180
        assert result.top_sku == "A"
        assert result.products[0].order_count == 2
        assert result.products[1].margin is None
        assert result.products[1].growth is None
        assert [p.sku for p in result.sold_out] == ["A"]
        # A tied revenue ranking must not depend on database row order.
        await session.execute(
            insert(OrderItem).values(
                id=uuid4(),
                order_id=oid,
                product_id=p2,
                sku="B",
                product_name="Test",
                quantity=1,
                unit_price=9000,
                total_price=9000,
            )
        )
        tied = await AnalyticsRepository(session).product_sales(end, end + timedelta(days=1))
        assert [row["sku"] for row in tied["products"]] == ["A", "B"]
        with patch(
            "backend.modules.analytics.service.period_to_range",
            return_value=(end + timedelta(days=50), end + timedelta(days=51)),
        ):
            empty = await svc.get_product_analytics()
        assert empty.average_margin is None
        assert empty.growth is None
        assert empty.coverage is None
        for _ in range(2):
            await session.execute(
                insert(Order).values(
                    id=uuid4(),
                    external_id="duplicate",
                    order_number="duplicate",
                    customer_name="Synthetic",
                    ordered_at=start,
                )
            )
        repo = SyncDataRepository(session)
        cursor = None
        seen = []
        while True:
            batch = await repo.find_orders_without_items(limit=1, after_external_id=cursor)
            if not batch:
                break
            seen.append(batch[0].id)
            cursor = f"id:{batch[0].id}"
        assert len(seen) == len(set(seen)) == 3
        assert seen == sorted(seen)
    await engine.dispose()
