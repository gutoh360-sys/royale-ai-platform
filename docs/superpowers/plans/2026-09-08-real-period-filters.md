# Real Period Filters — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all temporal selectors across Dashboard, Marketplace, and Marketplace Detail actually filter data by `Order.ordered_at` using a single canonical period contract.

**Architecture:** Backend gains a `period` query param (today|7d|30d|90d|12m) on `/orders` and `/analytics/dashboard`. All summary metrics (revenue, orders, ticket, status breakdown) are filtered by the same time window. Frontend replaces the broken `days` integer with the canonical `Period` string, adds period to Marketplace hooks/services, and wires the period selector on Marketplace Detail.

**Tech Stack:** Python/FastAPI backend, Next.js frontend, PostgreSQL, SQLAlchemy async, vitest

---

## Global Constraints

- **Timezone:** America/Sao_Paulo for all date math
- **Period values:** `today`, `7d`, `30d`, `90d`, `12m` (canonical contract)
- **Date field:** `Order.ordered_at` ONLY — never `created_at`, `updated_at`, `last_synced_at`
- **Revenue rule:** completed orders only (existing business rule, preserve)
- **Zero = zero:** If period has no sales, show R$ 0, 0 orders, ticket —
- **Growth:** Only show if real comparison exists, otherwise N/D
- **Products tab:** Do NOT regress commit 3637d2e (mocks removed)
- **No backend changes to:** analytics/products, catalog, integrations, sync
- **Hardcodes to eliminate:** `days=30` in api-analytics.ts, `new Date("2026-07-27")` in chart-mock.ts

---

## Task 1: Backend — Canonical period helper

**Files:**
- Create: `backend/core/period.py`
- Test: `backend/tests/unit/test_period.py`

**Interfaces:**
- Consumes: None (new module)
- Produces: `parse_period(value: str) -> Period`, `period_to_range(period: Period, tz: ZoneInfo) -> tuple[datetime, datetime]`

- [ ] **Step 1: Write failing test**

```python
# backend/tests/unit/test_period.py
from datetime import date, datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from backend.core.period import parse_period, period_to_range

TZ = ZoneInfo("America/Sao_Paulo")

def test_parse_period_valid():
    assert parse_period("today") == "today"
    assert parse_period("7d") == "7d"
    assert parse_period("30d") == "30d"
    assert parse_period("90d") == "90d"
    assert parse_period("12m") == "12m"

def test_parse_period_invalid():
    import pytest
    with pytest.raises(ValueError):
        parse_period("invalid")
    with pytest.raises(ValueError):
        parse_period("1d")

def test_period_today_range():
    start, end = period_to_range("today", TZ)
    today = datetime.now(TZ).date()
    assert start.date() == today
    assert end.date() == today + timedelta(days=1)

def test_period_7d_range():
    start, end = period_to_range("7d", TZ)
    today = datetime.now(TZ).date()
    assert start.date() == today - timedelta(days=6)
    assert end.date() == today + timedelta(days=1)

def test_period_30d_range():
    start, end = period_to_range("30d", TZ)
    today = datetime.now(TZ).date()
    assert start.date() == today - timedelta(days=29)
    assert end.date() == today + timedelta(days=1)

def test_period_90d_range():
    start, end = period_to_range("90d", TZ)
    today = datetime.now(TZ).date()
    assert start.date() == today - timedelta(days=89)
    assert end.date() == today + timedelta(days=1)

def test_period_12m_range():
    start, end = period_to_range("12m", TZ)
    today = datetime.now(TZ).date()
    expected_start = today.replace(year=today.year - 1)
    assert start.date() == expected_start
    assert end.date() == today + timedelta(days=1)

def test_start_inclusive_end_exclusive():
    """ordered_at >= start AND ordered_at < end"""
    start, end = period_to_range("7d", TZ)
    assert start.tzinfo is not None
    assert end.tzinfo is not None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/unit/test_period.py -v`
Expected: FAIL (module not found)

- [ ] **Step 3: Write implementation**

```python
# backend/core/period.py
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from typing import Literal

Period = Literal["today", "7d", "30d", "90d", "12m"]

VALID_PERIODS = {"today", "7d", "30d", "90d", "12m"}

BUSINESS_TZ = ZoneInfo("America/Sao_Paulo")


def parse_period(value: str) -> Period:
    if value not in VALID_PERIODS:
        raise ValueError(f"Invalid period: {value!r}. Must be one of {VALID_PERIODS}")
    return value  # type: ignore[return-value]


def period_to_range(period: Period, tz: ZoneInfo = BUSINESS_TZ) -> tuple[datetime, datetime]:
    """Return (start_inclusive, end_exclusive) for the given period in the given timezone."""
    now = datetime.now(tz)
    today = now.date()

    if period == "today":
        start_date = today
    elif period == "7d":
        start_date = today - timedelta(days=6)
    elif period == "30d":
        start_date = today - timedelta(days=29)
    elif period == "90d":
        start_date = today - timedelta(days=89)
    elif period == "12m":
        start_date = today.replace(year=today.year - 1)
    else:
        raise ValueError(f"Unhandled period: {period}")

    start = datetime(start_date.year, start_date.month, start_date.day, tzinfo=tz)
    end_date = today + timedelta(days=1)
    end = datetime(end_date.year, end_date.month, end_date.day, tzinfo=tz)

    return start, end
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/unit/test_period.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/core/period.py backend/tests/unit/test_period.py
git commit -m "feat(period): add canonical period parser and date range helper"
```

---

## Task 2: Backend — Add period filtering to analytics repository

**Files:**
- Modify: `backend/modules/analytics/repository.py`
- Test: `backend/tests/unit/modules/analytics/test_analytics.py`

**Interfaces:**
- Consumes: `Period`, `period_to_range` from Task 1
- Produces: Repository methods accept `start: datetime, end: datetime` params

- [ ] **Step 1: Write failing tests for time-filtered metrics**

Add to `backend/tests/unit/modules/analytics/test_analytics.py`:

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

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && python -m pytest tests/unit/modules/analytics/test_analytics.py::test_dashboard_filters_by_period -v`
Expected: FAIL (methods don't exist)

- [ ] **Step 3: Add period-filtered methods to repository**

Add these methods to `AnalyticsRepository` in `backend/modules/analytics/repository.py`:

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

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/unit/modules/analytics/test_analytics.py -v`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add backend/modules/analytics/repository.py backend/tests/unit/modules/analytics/test_analytics.py
git commit -m "feat(analytics): add period-filtered repository methods"
```

---

## Task 3: Backend — Wire period into analytics service and router

**Files:**
- Modify: `backend/modules/analytics/service.py`
- Modify: `backend/modules/analytics/router.py`
- Modify: `backend/modules/analytics/schemas.py` (add `period` field to response)
- Test: `backend/tests/unit/modules/analytics/test_analytics.py`

**Interfaces:**
- Consumes: Period-filtered repository methods from Task 2
- Produces: `GET /analytics/dashboard?period=7d` returns time-filtered summary

- [ ] **Step 1: Write failing test**

Add to `test_analytics.py`:

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

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/unit/modules/analytics/test_analytics.py::test_service_dashboard_uses_period -v`
Expected: FAIL

- [ ] **Step 3: Update service to use period**

Modify `backend/modules/analytics/service.py`:

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

- [ ] **Step 4: Update schemas to include period**

Add `period: str` field to `AnalyticsDashboardResponse` in `backend/modules/analytics/schemas.py`.

- [ ] **Step 5: Update router to accept period param**

Modify `backend/modules/analytics/router.py`:

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

- [ ] **Step 6: Run all analytics tests**

Run: `cd backend && python -m pytest tests/unit/modules/analytics/ -v`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add backend/modules/analytics/service.py backend/modules/analytics/router.py backend/modules/analytics/schemas.py
git commit -m "feat(analytics): wire period param through service and router"
```

---

## Task 4: Backend — Add period filtering to orders endpoint

**Files:**
- Modify: `backend/modules/order/router.py`
- Modify: `backend/modules/order/service.py`
- Modify: `backend/modules/order/repository.py`
- Modify: `backend/modules/order/ports.py`
- Test: `backend/tests/unit/modules/order/test_order_router.py`

**Interfaces:**
- Consumes: `Period`, `period_to_range` from Task 1
- Produces: `GET /orders?period=7d` returns only orders in window

- [ ] **Step 1: Write failing test**

Add to `backend/tests/unit/modules/order/test_order_router.py`:

```python
async def test_orders_period_filter(client):
    response = await client.get("/orders?period=7d")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
```

- [ ] **Step 2: Add period param to router**

Modify `backend/modules/order/router.py`:

```python
@router.get("", response_model=list[OrderResponse])
async def list_orders(
    status: str | None = Query(default=None, max_length=50),
    period: str | None = Query(default=None),
    service: OrderService = Depends(get_order_service),
) -> list[Order]:
    return await service.list_orders(status, period)
```

- [ ] **Step 3: Update service and repository**

Add `period` param through service → repository → `find_all`. In repository, if period is provided, compute start/end and add `where(Order.ordered_at >= start, Order.ordered_at < end)`.

- [ ] **Step 4: Update proxy allowlist**

In `frontend/src/app/api/backend/[...path]/route.ts`, add `"period"` to `ALLOWED_QUERY_PARAMS["orders"]`.

- [ ] **Step 5: Run tests**

Run: `cd backend && python -m pytest tests/unit/modules/order/ -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/modules/order/ frontend/src/app/api/backend/\[...path\]/route.ts
git commit -m "feat(orders): add period param to filter by ordered_at"
```

---

## Task 5: Frontend — Create shared period types and helpers

**Files:**
- Modify: `frontend/src/types/api.ts`
- Create: `frontend/src/lib/period.ts`
- Test: `frontend/src/lib/period.test.ts`

**Interfaces:**
- Consumes: Backend canonical period values
- Produces: `Period` type, `PERIOD_OPTIONS`, `periodToDays()`, `formatPeriodLabel()`

- [ ] **Step 1: Write failing test**

```typescript
// frontend/src/lib/period.test.ts
import { describe, it, expect } from "vitest";
import { parsePeriod, PERIOD_OPTIONS, periodToDays, formatPeriodLabel } from "@/lib/period";

describe("parsePeriod", () => {
  it("parses valid periods", () => {
    expect(parsePeriod("today")).toBe("today");
    expect(parsePeriod("7d")).toBe("7d");
    expect(parsePeriod("30d")).toBe("30d");
    expect(parsePeriod("90d")).toBe("90d");
    expect(parsePeriod("12m")).toBe("12m");
  });

  it("defaults to 30d for invalid", () => {
    expect(parsePeriod("invalid")).toBe("30d");
    expect(parsePeriod("")).toBe("30d");
  });
});

describe("periodToDays", () => {
  it("converts correctly", () => {
    expect(periodToDays("today")).toBe(1);
    expect(periodToDays("7d")).toBe(7);
    expect(periodToDays("30d")).toBe(30);
    expect(periodToDays("90d")).toBe(90);
    expect(periodToDays("12m")).toBe(365);
  });
});

describe("formatPeriodLabel", () => {
  it("formats labels", () => {
    expect(formatPeriodLabel("today")).toBe("Hoje");
    expect(formatPeriodLabel("7d")).toBe("7 dias");
    expect(formatPeriodLabel("30d")).toBe("30 dias");
    expect(formatPeriodLabel("90d")).toBe("90 dias");
    expect(formatPeriodLabel("12m")).toBe("12 meses");
  });
});

describe("PERIOD_OPTIONS", () => {
  it("has 5 options", () => {
    expect(PERIOD_OPTIONS).toHaveLength(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/lib/period.test.ts`
Expected: FAIL

- [ ] **Step 3: Create period helper**

```typescript
// frontend/src/lib/period.ts
export type Period = "today" | "7d" | "30d" | "90d" | "12m";

export const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
  { value: "12m", label: "12 meses" },
];

const VALID_PERIODS = new Set<string>(PERIOD_OPTIONS.map((o) => o.value));

export function parsePeriod(value: string | null | undefined): Period {
  if (value && VALID_PERIODS.has(value)) return value as Period;
  return "30d";
}

export function periodToDays(period: Period): number {
  switch (period) {
    case "today": return 1;
    case "7d": return 7;
    case "30d": return 30;
    case "90d": return 90;
    case "12m": return 365;
  }
}

export function formatPeriodLabel(period: Period): string {
  return PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? period;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/lib/period.test.ts`
Expected: PASS

- [ ] **Step 5: Update AnalyticsPeriodDays type in api.ts**

Replace `export type AnalyticsPeriodDays = 1 | 7 | 30;` with a re-export:
```typescript
// Keep legacy type for backward compat during migration
export type AnalyticsPeriodDays = 1 | 7 | 30;
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/period.ts frontend/src/lib/period.test.ts frontend/src/types/api.ts
git commit -m "feat(period): add shared period types and helpers for frontend"
```

---

## Task 6: Frontend — Update proxy to forward period param

**Files:**
- Modify: `frontend/src/app/api/backend/[...path]/route.ts`
- Test: `frontend/src/app/api/backend/[...path]/route.test.ts`

**Interfaces:**
- Consumes: Canonical period values from Task 5
- Produces: Proxy forwards `period` to backend for orders and analytics/dashboard

- [ ] **Step 1: Update ALLOWED_QUERY_PARAMS**

```typescript
const ALLOWED_QUERY_PARAMS: Record<string, Set<string>> = {
  "analytics/dashboard": new Set(["days", "period"]),
  "analytics/products": new Set(),
  orders: new Set(["status", "period"]),
  products: new Set(),
  "sales-channels": new Set(),
};
```

- [ ] **Step 2: Run proxy tests**

Run: `cd frontend && npx vitest run src/app/api/backend/\[...path\]/route.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/api/backend/\[...path\]/route.ts
git commit -m "feat(proxy): forward period param to backend orders and analytics"
```

---

## Task 7: Frontend — Dashboard uses canonical period

**Files:**
- Modify: `frontend/src/features/dashboard/components/dashboard-header.tsx`
- Modify: `frontend/src/features/dashboard/components/dashboard-page.tsx`
- Modify: `frontend/src/services/api-command-center.ts`
- Modify: `frontend/src/services/api-orders.ts`
- Modify: `frontend/src/services/api-analytics.ts`
- Test: `frontend/src/features/dashboard/tests/dashboard-real-data.test.ts`

**Interfaces:**
- Consumes: `Period`, `PERIOD_OPTIONS`, `parsePeriod` from Task 5
- Produces: Dashboard sends `period=X` to backend, all data changes on selection

- [ ] **Step 1: Update dashboard-header.tsx periods**

Replace:
```typescript
const periods: { label: string; days: AnalyticsPeriodDays }[] = [
  { label: "Hoje", days: 1 },
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
];
```

With:
```typescript
import { PERIOD_OPTIONS, type Period } from "@/lib/period";

// In PeriodSelector:
interface PeriodSelectorProps {
  period: Period;
  onPeriodChange?: (period: Period) => void;
}

function PeriodSelector({ period, onPeriodChange }: PeriodSelectorProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border p-0.5">
      {PERIOD_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onPeriodChange?.(opt.value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            period === opt.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Update dashboard-page.tsx state**

Replace `const [days, setDays] = useState<AnalyticsPeriodDays>(7)` with:
```typescript
const [period, setPeriod] = useState<Period>("7d");
```

Pass `period` to hooks instead of `days`.

- [ ] **Step 3: Update service calls**

In `api-command-center.ts`: Change `api.get<DashboardAnalytics>(\`/analytics/dashboard?days=${days}\`)` to `api.get<DashboardAnalytics>(\`/analytics/dashboard?period=${period}\`)`

Same for `api-orders.ts`.

In `api-analytics.ts`: Remove hardcoded `?days=30`, accept `period` param.

- [ ] **Step 4: Update all tests**

Update dashboard tests to check for `period=` instead of `days=`.

- [ ] **Step 5: Run tests**

Run: `cd frontend && npx vitest run src/features/dashboard/`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/dashboard/ frontend/src/services/api-command-center.ts frontend/src/services/api-orders.ts frontend/src/services/api-analytics.ts
git commit -m "feat(dashboard): switch to canonical period selector"
```

---

## Task 8: Frontend — Marketplace uses period param

**Files:**
- Modify: `frontend/src/services/api-marketplace.ts`
- Modify: `frontend/src/features/marketplace/hooks/use-marketplace-data.ts`
- Modify: `frontend/src/features/marketplace/types/index.ts`

**Interfaces:**
- Consumes: `Period` from Task 5
- Produces: `fetchMarketplaceData(period)` sends `GET /orders?period=X`

- [ ] **Step 1: Add period param to fetchMarketplaceData**

```typescript
export async function fetchMarketplaceData(period: Period = "30d"): Promise<MarketplaceDataResult> {
  try {
    const [channels, orders] = await Promise.all([
      api.get<SalesChannel[]>("/sales-channels"),
      api.get<Order[]>(`/orders?period=${period}`),
    ]);
    // ... rest unchanged
  }
}
```

- [ ] **Step 2: Update hook to accept period**

```typescript
export function useMarketplaceData(period: Period = "30d"): MarketplaceDataResult {
  const [result, setResult] = useState<MarketplaceDataResult>({ ... });

  useEffect(() => {
    fetchMarketplaceData(period).then(setResult);
  }, [period]);

  return result;
}
```

- [ ] **Step 3: Update consumers**

Pass `period` from Dashboard and Marketplace pages to `useMarketplaceData(period)`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/services/api-marketplace.ts frontend/src/features/marketplace/hooks/use-marketplace-data.ts
git commit -m "feat(marketplace): wire period param through hook and service"
```

---

## Task 9: Frontend — Marketplace Detail wires period selector

**Files:**
- Modify: `frontend/src/features/marketplace/components/marketplace-detail-page.tsx`
- Modify: `frontend/src/features/marketplace/components/marketplace-overview.tsx`
- Delete: `frontend/src/features/marketplace/mocks/chart-mock.ts` (or replace with real data)

**Interfaces:**
- Consumes: `useMarketplaceData(period)` from Task 8
- Produces: Period selector on Marketplace Detail actually changes data

- [ ] **Step 1: Wire activePeriod to useMarketplaceData**

In `marketplace-detail-page.tsx`:

```typescript
import { parsePeriod, type Period } from "@/lib/period";

export function MarketplaceDetailPage({ slug }: MarketplaceDetailPageProps) {
  const [activePeriod, setActivePeriod] = useState<Period>("30d");
  const { marketplaces, status } = useMarketplaceData(activePeriod);
  // ... rest uses marketplace data which now changes with period
}
```

- [ ] **Step 2: Replace chart mock with real sales_by_period data**

The `getChartData` from `chart-mock.ts` generates fake data. Replace with real `sales_by_period` from the backend. Add `sales_by_period` to the marketplace data fetching, or use the dashboard analytics endpoint.

- [ ] **Step 3: Add period selector to Marketplace Overview**

Add the same `PERIOD_OPTIONS` selector to `marketplace-overview.tsx`.

- [ ] **Step 4: Run tests**

Run: `cd frontend && npx vitest run src/features/marketplace/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/marketplace/
git commit -m "feat(marketplace-detail): wire period selector to real data"
```

---

## Task 10: Growth calculation

**Files:**
- Modify: `frontend/src/services/api-marketplace.ts`

**Interfaces:**
- Consumes: Period-filtered data from Tasks 3, 8
- Produces: Real growth % (current period vs previous period)

- [ ] **Step 1: Add previous period comparison**

For each marketplace, fetch orders for current period AND previous period:
```typescript
const [currentOrders, previousOrders] = await Promise.all([
  api.get<Order[]>(`/orders?period=${period}`),
  api.get<Order[]>(`/orders?period=${previousPeriod}`),
]);
```

Compute growth: `((currentRevenue - previousRevenue) / previousRevenue) * 100`

If previousRevenue === 0: show N/D.

- [ ] **Step 2: Update MarketplaceData type**

Change `growth: number` to `growth: number | null` (null = N/D).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/services/api-marketplace.ts frontend/src/features/marketplace/types/
git commit -m "feat(marketplace): add real period-over-period growth"
```

---

## Task 11: Backend temporal tests (comprehensive)

**Files:**
- Create: `backend/tests/unit/modules/analytics/test_period_filtering.py`

- [ ] **Step 1: Create fixture-based tests**

```python
# Test today, 7d, 30d, 90d, 12m with controlled ordered_at values
# Validate start inclusive, end exclusive
# Validate timezone UTC vs Sao Paulo
# Validate zero results show zero
# Validate revenue only counts completed
# Validate average_ticket is correct
```

- [ ] **Step 2: Run tests**

Run: `cd backend && python -m pytest tests/unit/modules/analytics/test_period_filtering.py -v`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add backend/tests/unit/modules/analytics/test_period_filtering.py
git commit -m "test(analytics): add comprehensive period filtering tests"
```

---

## Task 12: Frontend period tests

**Files:**
- Create: `frontend/src/features/marketplace/tests/period-filtering.test.ts`
- Create: `frontend/src/features/dashboard/tests/period-filtering.test.ts`

- [ ] **Step 1: Write tests**

Test that:
- Dashboard sends `period=7d` when 7d selected
- Marketplace sends `period=30d` when 30d selected
- URL contains `?period=X`
- Period selector renders all 5 options
- Changing period triggers re-fetch

- [ ] **Step 2: Run tests**

Run: `cd frontend && npx vitest run`
Expected: ALL PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/marketplace/tests/ frontend/src/features/dashboard/tests/
git commit -m "test(frontend): add period filtering tests for dashboard and marketplace"
```

---

## Task 13: Hardcode sweep and cleanup

**Files:**
- Various

- [ ] **Step 1: Search for remaining hardcodes**

Search for: `days=7`, `days=30`, `days=90`, `365`, `mockPeriod`, `fakePeriod`, `new Date("2026`

- [ ] **Step 2: Remove/fix each one**

- [ ] **Step 3: Remove chart-mock.ts if replaced**

- [ ] **Step 4: Run full test suites**

```bash
cd frontend && npm test && npm run typecheck && npm run build
cd backend && python -m pytest
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove hardcoded period values and mock chart data"
```

---

## Task 14: Final validation and commit

- [ ] **Step 1: Run ALL gates**

Backend:
```bash
cd backend && python -m pytest -v && python -m py_compile backend/core/period.py && ruff check
```

Frontend:
```bash
cd frontend && npm test && npm run typecheck && npm run build
```

- [ ] **Step 2: Validate Products tab not regressed**

```bash
cd frontend && npx vitest run src/features/products-executive/
```

- [ ] **Step 3: Evidence of real data changing**

Test with curl or local queries:
```bash
# Should return different counts
curl "http://localhost:8000/analytics/dashboard?period=today"
curl "http://localhost:8000/analytics/dashboard?period=7d"
curl "http://localhost:8000/analytics/dashboard?period=30d"
```

- [ ] **Step 4: Final commit and push**

```bash
git add -A
git commit -m "fix(analytics): apply real period filters across sales views"
git push origin main
```

- [ ] **Step 5: Deploy (if possible)**

Attempt EasyPanel deploy for both backend and frontend. If not possible, report SHA and instructions.

---

## Files Modified (Summary)

| File | Change |
|------|--------|
| `backend/core/period.py` | NEW — canonical period helper |
| `backend/modules/analytics/repository.py` | Add period-filtered query methods |
| `backend/modules/analytics/service.py` | Wire period through to all metrics |
| `backend/modules/analytics/router.py` | Accept `period` query param |
| `backend/modules/analytics/schemas.py` | Add `period` field to response |
| `backend/modules/order/router.py` | Accept `period` query param |
| `backend/modules/order/service.py` | Pass period to repository |
| `backend/modules/order/repository.py` | Filter by `ordered_at` when period given |
| `frontend/src/lib/period.ts` | NEW — shared period types/helpers |
| `frontend/src/types/api.ts` | Keep legacy type, add period imports |
| `frontend/src/app/api/backend/[...path]/route.ts` | Forward `period` param |
| `frontend/src/features/dashboard/components/dashboard-header.tsx` | 5-option period selector |
| `frontend/src/features/dashboard/components/dashboard-page.tsx` | Use `Period` state |
| `frontend/src/services/api-command-center.ts` | Send `period=` |
| `frontend/src/services/api-orders.ts` | Send `period=` |
| `frontend/src/services/api-analytics.ts` | Remove hardcoded days=30 |
| `frontend/src/services/api-marketplace.ts` | Accept `period` param |
| `frontend/src/features/marketplace/hooks/use-marketplace-data.ts` | Accept `period` param |
| `frontend/src/features/marketplace/components/marketplace-detail-page.tsx` | Wire period selector |
| `frontend/src/features/marketplace/components/marketplace-overview.tsx` | Add period selector |
| `frontend/src/features/marketplace/mocks/chart-mock.ts` | DELETE or replace |
