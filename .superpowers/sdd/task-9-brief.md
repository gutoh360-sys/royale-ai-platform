# Task 9: Frontend — Marketplace Detail wires period selector

**Files:**
- Modify: `frontend/src/features/marketplace/components/marketplace-detail-page.tsx`
- Modify: `frontend/src/features/marketplace/components/marketplace-overview.tsx`
- Delete or replace: `frontend/src/features/marketplace/mocks/chart-mock.ts`

**Interfaces:**
- Consumes: `useMarketplaceData(period)` from Task 8
- Produces: Period selector on Marketplace Detail actually changes data

**Steps:**

1. Wire activePeriod to useMarketplaceData
2. Replace chart mock with real sales_by_period data
3. Add period selector to Marketplace Overview
4. Run tests
5. Commit

**marketplace-detail-page.tsx changes:**

The current code has:
```typescript
const PERIODS = ["7 dias", "30 dias", "90 dias", "12 meses"] as const;
const [activePeriod, setActivePeriod] = useState<string>("30 dias");
const { marketplaces, status } = useMarketplaceData();
```

Change to:
```typescript
import { PERIOD_OPTIONS, type Period } from "@/lib/period";

const [activePeriod, setActivePeriod] = useState<Period>("30d");
const { marketplaces, status } = useMarketplaceData(activePeriod);
```

Update the button group to use `PERIOD_OPTIONS`:
```typescript
<div className="flex items-center gap-1 rounded-lg border p-0.5" role="tablist" aria-label="Selecionar período">
  {PERIOD_OPTIONS.map((opt) => (
    <button
      key={opt.value}
      onClick={() => setActivePeriod(opt.value)}
      role="tab"
      aria-selected={activePeriod === opt.value}
      className={cn(
        "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
        activePeriod === opt.value
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {opt.label}
    </button>
  ))}
</div>
```

**Chart mock replacement:**

The `getChartData` function in `chart-mock.ts` generates fake random data. Replace with a simpler approach - either:
1. Use empty chart data until real `sales_by_period` is available from the backend
2. Or create a simple function that maps the marketplace's revenue/orders into a single data point

For now, simplest approach: create a utility that generates minimal chart data from the marketplace's actual revenue and orders, without random noise.

**marketplace-overview.tsx changes:**

Add a period selector similar to the Dashboard header. Use `PERIOD_OPTIONS` and pass the selected period to `useMarketplaceData`.

**Work from:** `C:\Users\gutod\Documents\royale-platform\frontend`

**Report file:** `C:\Users\gutod\Documents\royale-platform\.superpowers\sdd\task-9-report.md`
