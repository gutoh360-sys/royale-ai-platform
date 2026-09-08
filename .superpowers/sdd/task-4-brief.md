# Task 4: Backend — Add period filtering to orders endpoint

**Files:**
- Modify: `backend/modules/order/router.py`
- Modify: `backend/modules/order/service.py`
- Modify: `backend/modules/order/repository.py`
- Modify: `backend/modules/order/ports.py`
- Test: `backend/tests/unit/modules/order/test_order_router.py`
- Modify: `frontend/src/app/api/backend/[...path]/route.ts` (add "period" to orders allowlist)

**Interfaces:**
- Consumes: `Period`, `period_to_range` from Task 1
- Produces: `GET /orders?period=7d` returns only orders in window

**Steps:**

1. Write failing test
2. Add period param to router
3. Update service and repository
4. Update proxy allowlist
5. Run tests
6. Commit

**Test code to add:**

```python
async def test_orders_period_filter(client):
    response = await client.get("/orders?period=7d")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
```

**Router changes (`backend/modules/order/router.py`):**

```python
@router.get("", response_model=list[OrderResponse])
async def list_orders(
    status: str | None = Query(default=None, max_length=50),
    period: str | None = Query(default=None),
    service: OrderService = Depends(get_order_service),
) -> list[Order]:
    return await service.list_orders(status, period)
```

**Service changes (`backend/modules/order/service.py`):**

```python
async def list_orders(self, status: str | None = None, period: str | None = None) -> list[Order]:
    return await self._order_repo.find_all(status, period)
```

**Repository changes (`backend/modules/order/repository.py`):**

```python
from backend.core.period import parse_period, period_to_range, BUSINESS_TZ

async def find_all(self, status: str | None = None, period: str | None = None) -> list[Order]:
    stmt = select(Order)
    if status is not None:
        stmt = stmt.where(Order.status == status)
    if period is not None:
        parsed = parse_period(period)
        start, end = period_to_range(parsed, BUSINESS_TZ)
        stmt = stmt.where(Order.ordered_at >= start, Order.ordered_at < end)
    stmt = stmt.order_by(Order.created_at, Order.id)
    result = await self._session.execute(stmt)
    return list(result.scalars().all())
```

**Port changes (`backend/modules/order/ports.py`):**

```python
@abstractmethod
async def find_all(self, status: str | None = None, period: str | None = None) -> list[Order]: ...
```

**Proxy changes (`frontend/src/app/api/backend/[...path]/route.ts`):**

Add `"period"` to `ALLOWED_QUERY_PARAMS["orders"]`:
```typescript
orders: new Set(["status", "period"]),
```

**Work from:** `C:\Users\gutod\Documents\royale-platform`

**Report file:** `C:\Users\gutod\Documents\royale-platform\.superpowers\sdd\task-4-report.md`
