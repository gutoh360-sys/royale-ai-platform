# Task 5: Frontend — Create shared period types and helpers

**Files:**
- Modify: `frontend/src/types/api.ts`
- Create: `frontend/src/lib/period.ts`
- Test: `frontend/src/lib/period.test.ts`

**Interfaces:**
- Consumes: Backend canonical period values (today, 7d, 30d, 90d, 12m)
- Produces: `Period` type, `PERIOD_OPTIONS`, `periodToDays()`, `formatPeriodLabel()`

**Steps:**

1. Write failing test
2. Run test to verify it fails
3. Create period helper
4. Run test to verify it passes
5. Update AnalyticsPeriodDays type in api.ts (keep for backward compat)
6. Commit

**Test code (`frontend/src/lib/period.test.ts`):**

```typescript
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

**Implementation code (`frontend/src/lib/period.ts`):**

```typescript
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

**Work from:** `C:\Users\gutod\Documents\royale-platform`

**Report file:** `C:\Users\gutod\Documents\royale-platform\.superpowers\sdd\task-5-report.md`
