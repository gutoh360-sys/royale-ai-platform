# Task 7: Frontend — Dashboard uses canonical period

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

**Steps:**

1. Update dashboard-header.tsx periods
2. Update dashboard-page.tsx state
3. Update service calls
4. Update all tests
5. Run tests
6. Commit

**dashboard-header.tsx changes:**

Replace the periods array and PeriodSelector to use `PERIOD_OPTIONS` from `@/lib/period`:

```typescript
import { PERIOD_OPTIONS, type Period } from "@/lib/period";

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

**dashboard-page.tsx changes:**

Replace `const [days, setDays] = useState<AnalyticsPeriodDays>(7)` with:
```typescript
const [period, setPeriod] = useState<Period>("7d");
```

Pass `period` to hooks instead of `days`.

**Service changes:**

In `api-command-center.ts`: Change `api.get<DashboardAnalytics>(\`/analytics/dashboard?days=${days}\`)` to `api.get<DashboardAnalytics>(\`/analytics/dashboard?period=${period}\`)`

Same for `api-orders.ts`.

In `api-analytics.ts`: Remove hardcoded `?days=30`, accept `period` param.

**Work from:** `C:\Users\gutod\Documents\royale-platform\frontend`

**Report file:** `C:\Users\gutod\Documents\royale-platform\.superpowers\sdd\task-7-report.md`
