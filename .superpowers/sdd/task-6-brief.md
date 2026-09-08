# Task 6: Frontend — Update proxy to forward period param

**Files:**
- Modify: `frontend/src/app/api/backend/[...path]/route.ts`

**Interfaces:**
- Consumes: Canonical period values from Task 5
- Produces: Proxy forwards `period` to backend for orders and analytics/dashboard

**Steps:**

1. Update ALLOWED_QUERY_PARAMS
2. Run proxy tests
3. Commit

**Changes to `frontend/src/app/api/backend/[...path]/route.ts`:**

Replace:
```typescript
const ALLOWED_QUERY_PARAMS: Record<string, Set<string>> = {
  "analytics/dashboard": new Set(["days"]),
  "analytics/products": new Set(),
  orders: new Set(["status"]),
  products: new Set(),
  "sales-channels": new Set(),
};
```

With:
```typescript
const ALLOWED_QUERY_PARAMS: Record<string, Set<string>> = {
  "analytics/dashboard": new Set(["days", "period"]),
  "analytics/products": new Set(),
  orders: new Set(["status", "period"]),
  products: new Set(),
  "sales-channels": new Set(),
};
```

**Work from:** `C:\Users\gutod\Documents\royale-platform\frontend`

**Report file:** `C:\Users\gutod\Documents\royale-platform\.superpowers\sdd\task-6-report.md`
