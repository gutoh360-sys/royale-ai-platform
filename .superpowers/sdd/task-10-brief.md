# Task 10: Growth calculation

**Files:**
- Modify: `frontend/src/services/api-marketplace.ts`
- Modify: `frontend/src/features/marketplace/types/index.ts`

**Interfaces:**
- Consumes: Period-filtered data from Tasks 3, 8
- Produces: Real growth % (current period vs previous period)

**Steps:**

1. Add previous period comparison
2. Update MarketplaceData type
3. Commit

**api-marketplace.ts changes:**

For each marketplace, fetch orders for current period AND previous period:

```typescript
import { type Period, periodToDays } from "@/lib/period";

function getPreviousPeriod(period: Period): Period {
  const map: Record<Period, Period> = {
    "today": "7d",
    "7d": "30d",
    "30d": "90d",
    "90d": "12m",
    "12m": "12m",
  };
  return map[period];
}

export async function fetchMarketplaceData(period: Period = "30d"): Promise<MarketplaceDataResult> {
  try {
    const previousPeriod = getPreviousPeriod(period);
    const [channels, currentOrders, previousOrders] = await Promise.all([
      api.get<SalesChannel[]>("/sales-channels"),
      api.get<Order[]>(`/orders?period=${period}`),
      api.get<Order[]>(`/orders?period=${previousPeriod}`),
    ]);
    
    // ... compute growth for each marketplace
    // growth = ((currentRevenue - previousRevenue) / previousRevenue) * 100
    // If previousRevenue === 0: growth = null (N/D)
  }
}
```

**types/index.ts changes:**

Change `growth: number` to `growth: number | null` in `MarketplaceData`.

**Work from:** `C:\Users\gutod\Documents\royale-platform\frontend`

**Report file:** `C:\Users\gutod\Documents\royale-platform\.superpowers\sdd\task-10-report.md`
