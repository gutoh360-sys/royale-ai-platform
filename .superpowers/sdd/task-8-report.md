# Task 8 Report: Frontend — Marketplace uses period param

**Status:** DONE

## Changes Made

### 1. `frontend/src/services/api-marketplace.ts`
- Imported `Period` type from `@/lib/period`
- Added `period: Period = "30d"` parameter to `fetchMarketplaceData`
- Updated orders URL to `/orders?period=${period}`

### 2. `frontend/src/features/marketplace/hooks/use-marketplace-data.ts`
- Imported `Period` type from `@/lib/period`
- Added `period: Period = "30d"` parameter to `useMarketplaceData`
- Added `period` to `useEffect` dependency array
- Passes `period` to `fetchMarketplaceData(period)`

### 3. `frontend/src/features/dashboard/components/dashboard-page.tsx`
- Updated `useMarketplaceData()` call to `useMarketplaceData(period)` so the dashboard's selected period flows through

### 4. Test fixes
- `api-real-data.test.ts`: Updated assertion to expect `?period=30d` in the orders URL (since `fetchMarketplaceData()` defaults to "30d")
- `api-screen-regression.test.ts`: Updated source-reading assertion to match the new template literal format

## Verification
- `tsc --noEmit`: clean (no errors)
- `vitest run`: 52 test files, 727 tests — all passing

## Notes
- Default period is "30d" matching `parsePeriod` fallback, so existing callers (`useMarketplaceData()` without args) continue working unchanged
- Other consumers (executive-copilot, marketplace-detail-page, marketplace-overview) inherit the "30d" default without changes
