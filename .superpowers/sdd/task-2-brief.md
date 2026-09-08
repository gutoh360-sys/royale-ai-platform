# Task 2: Backend — Add period filtering to analytics repository

**Files:**
- Modify: `backend/modules/analytics/repository.py`
- Test: `backend/tests/unit/modules/analytics/test_analytics.py`

**Interfaces:**
- Consumes: `Period`, `period_to_range` from Task 1 (already implemented at `backend/core/period.py`)
- Produces: Repository methods accept `start: datetime, end: datetime` params

**Steps:**

1. Write failing tests for time-filtered metrics
2. Run tests to verify they fail
3. Add period-filtered methods to repository
4. Run tests to verify they pass
5. Commit

**Test code to add to `backend/tests/unit/modules/analytics/test_analytics.py`:**

```python
from datetime import timedelta
from backend.core.period import period_to_range, BUSINESS_TZ

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
```

**Implementation code to add to `AnalyticsRepository` in `backend/modules/analytics/repository.py`:**

```python
async def count_orders_in_period(self, start: datetime, end: datetime) -> int:
    stmt = select(func.count(Order.id)).where(
        Order.ordered_at >= start, Order.ordered_at < end
    )
    result = await self._session.execute(stmt)
    return int(result.scalar_one())

async def count_completed_orders_in_period(self, start: datetime, end: datetime) -> int:
    stmt = select(func.count(Order.id)).where(
        Order.status == "completed",
        Order.ordered_at >= start, Order.ordered_at < end,
    )
    result = await self._session.execute(stmt)
    return int(result.scalar_one())

async def revenue_in_period(self, start: datetime, end: datetime) -> float:
    stmt = select(func.coalesce(func.sum(Order.total_amount), 0)).where(
        Order.status == "completed",
        Order.ordered_at >= start, Order.ordered_at < end,
    )
    result = await self._session.execute(stmt)
    return float(result.scalar_one())

async def orders_by_status_in_period(self, start: datetime, end: datetime) -> dict[str, int]:
    stmt = select(Order.status, func.count(Order.id)).where(
        Order.ordered_at >= start, Order.ordered_at < end
    ).group_by(Order.status)
    result = await self._session.execute(stmt)
    return {status: int(count) for status, count in result.all()}
```

**Existing code context:**
- The `_order` helper in test_analytics.py currently uses `ordered_at=datetime.now(UTC)`. You need to update it to accept an `ordered_at` parameter so tests can control the date.
- The existing `_order` function is at line 43-62 of `backend/tests/unit/modules/analytics/test_analytics.py`
- The existing `AnalyticsRepository` is at `backend/modules/analytics/repository.py`
- The existing test conftest with `db_session` fixture is at `backend/tests/unit/modules/analytics/conftest.py`

**Work from:** `C:\Users\gutod\Documents\royale-platform`

**Report file:** `C:\Users\gutod\Documents\royale-platform\.superpowers\sdd\task-2-report.md`
