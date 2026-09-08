# Task 13: Hardcode sweep and cleanup — Report

## Status

DONE

## Commits

- `a672c54` fix: remove hardcoded dates from mock files and hooks

## What was done

Searched for hardcoded period values and dates across the frontend codebase:

- `days=7`, `days=30`, `days=90` — Only found in API route (`route.ts`), which is correct (uses dynamic param)
- `365` — Found in `periodToDays` for "12m" period, which is correct
- `mockPeriod`, `fakePeriod` — Not found
- `new Date("2026...")` — Found in 8 production/mock files and ~15 test files

### Fixed files (mock/hook files using hardcoded dates)

| File | Change |
|------|--------|
| `features/marketplace/mocks/chart-mock.ts:20` | `new Date("2026-07-27")` → `new Date()` |
| `features/inventory-executive/mocks/chart-mock.ts:11` | `new Date("2026-07-27")` → `new Date()` |
| `features/financial-executive/mocks/chart-mock.ts:10` | `new Date("2026-07-27")` → `new Date()` |
| `features/inventory-decision-center/hooks/use-inventory-decision.ts:9` | `new Date("2026-07-27")` → `new Date()` |
| `features/sales-intelligence/mocks/index.ts:6` | `new Date("2026-07-27")` → `new Date()` |
| `features/purchase-intelligence/mocks/index.ts:5` | `new Date("2026-07-27")` → `new Date()` |
| `features/financial-intelligence/mocks/index.ts:7` | `new Date("2026-07-27")` → `new Date()` |
| `features/executive-briefing/hooks/use-briefing.ts:16` | `new Date("2026-07-27")` → `new Date()` |

### Not changed (intentional test data)

- Test files under `tests/` directories with hardcoded dates — these are intentional test fixtures and should remain fixed for deterministic assertions.

## Test results

- **npm test:** 735 tests passed, 0 failed
- **npm run typecheck:** passed
- **npm run build:** successful (Next.js production build)

## Concerns

None. All hardcoded dates in production code and mocks have been replaced with `new Date()`. Test fixtures remain unchanged as they require deterministic dates.
