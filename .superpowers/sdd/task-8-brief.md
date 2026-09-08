# Task 8: Frontend — Marketplace uses period param

**Files:**
- Modify: `frontend/src/services/api-marketplace.ts`
- Modify: `frontend/src/features/marketplace/hooks/use-marketplace-data.ts`

**Interfaces:**
- Consumes: `Period` from Task 5
- Produces: `fetchMarketplaceData(period)` sends `GET /orders?period=X`

**Steps:**

1. Add period param to fetchMarketplaceData
2. Update hook to accept period
3. Update consumers (Dashboard page)
4. Commit

**api-marketplace.ts changes:**

```typescript
import { type Period } from "@/lib/period";

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

**use-marketplace-data.ts changes:**

```typescript
import { type Period } from "@/lib/period";

export function useMarketplaceData(period: Period = "30d"): MarketplaceDataResult {
  const [result, setResult] = useState<MarketplaceDataResult>({ ... });

  useEffect(() => {
    fetchMarketplaceData(period).then(setResult);
  }, [period]);

  return result;
}
```

**Dashboard page changes:**

In `frontend/src/features/dashboard/components/dashboard-page.tsx`, update the call:
```typescript
const { summary: mpSummary, status: mpStatus } = useMarketplaceData(period);
```

**Work from:** `C:\Users\gutod\Documents\royale-platform\frontend`

**Report file:** `C:\Users\gutod\Documents\royale-platform\.superpowers\sdd\task-8-report.md`
