# Task 3: Backend — Wire period into analytics service and router

**Files:**
- Modify: `backend/modules/analytics/service.py`
- Modify: `backend/modules/analytics/router.py`
- Modify: `backend/modules/analytics/schemas.py` (add `period` field to response)
- Test: `backend/tests/unit/modules/analytics/test_analytics.py`

**Interfaces:**
- Consumes: Period-filtered repository methods from Task 2
- Produces: `GET /analytics/dashboard?period=7d` returns time-filtered summary

**Steps:**

1. Write failing test
2. Run test to verify it fails
3. Update service to use period
4. Update schemas to include period
5. Update router to accept period param
6. Run all analytics tests
7. Commit

**Test code to add:**

```python
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
```

**Service changes (`backend/modules/analytics/service.py`):**

```python
from backend.core.period import parse_period, period_to_range, BUSINESS_TZ

class AnalyticsService:
    def __init__(self, repository: AnalyticsRepository) -> None:
        self._repository = repository

    async def get_dashboard(self, period: str = "30d") -> AnalyticsDashboardResponse:
        parsed = parse_period(period)
        start, end = period_to_range(parsed, BUSINESS_TZ)

        total_orders = await self._repository.count_orders_in_period(start, end)
        completed_orders = await self._repository.count_completed_orders_in_period(start, end)
        revenue = Decimal(str(await self._repository.revenue_in_period(start, end)))
        average_ticket = round(revenue / completed_orders, 2) if completed_orders else None

        sales_by_period = [
            SalesByPeriodResponse(day=day, total_orders=count, revenue=Decimal(str(total)))
            for day, count, total in await self._repository.sales_by_period(
                start.date(), end.date() - timedelta(days=1)
            )
        ]

        return AnalyticsDashboardResponse(
            total_products=await self._repository.count_products(),
            active_products=await self._repository.count_active_products(),
            products_without_stock=await self._repository.count_products_without_stock(),
            total_stock=await self._repository.sum_stock(),
            total_orders=total_orders,
            orders_by_status=await self._repository.orders_by_status_in_period(start, end),
            revenue=revenue,
            average_ticket=average_ticket,
            sales_by_period=sales_by_period,
            period=period,
        )
```

**Schema changes (`backend/modules/analytics/schemas.py`):**

Add `period: str` field to `AnalyticsDashboardResponse`.

**Router changes (`backend/modules/analytics/router.py`):**

```python
from backend.core.period import VALID_PERIODS

@router.get("/dashboard", response_model=AnalyticsDashboardResponse, ...)
async def get_dashboard(
    period: str = Query(default="30d"),
    days: int | None = Query(default=None, deprecated=True),
    service: AnalyticsService = Depends(get_analytics_service),
) -> AnalyticsDashboardResponse:
    # Legacy compat: convert days to period if provided
    if days is not None and period == "30d":
        period_map = {1: "today", 7: "7d", 30: "30d"}
        period = period_map.get(days, "30d")
    return await service.get_dashboard(period=period)
```

**Work from:** `C:\Users\gutod\Documents\royale-platform`

**Report file:** `C:\Users\gutod\Documents\royale-platform\.superpowers\sdd\task-3-report.md`
