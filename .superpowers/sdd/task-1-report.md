# Task 1: Reorganize Navigation — Report

**Status:** DONE

**Commit:** `5828dbf` — `refactor(nav): simplify sidebar to 5 working features`

**Tests:** 735 passed, 0 failed

## Changes Made

### `frontend/src/features/navigation/config.ts`
- Removed 6 unused icon imports (`Wallet`, `ShoppingCart`, `Bot`, `BarChart3`, `Settings`)
- Added `section?: "main" | "secondary"` to `NavItem` interface
- Reduced `NAV_ITEMS` from 11 to exactly 5 items: Dashboard, Marketplace, Produtos, Estoque, Integrações
- Renamed "Sync Bling" → "Integrações" for clearer UX
- All items marked with `section: "main"`

### `frontend/src/features/navigation/components/navigation-sidebar.tsx`
- Added section filter: `if (item.section && item.section !== "main") return false`
- Permission-based filtering preserved unchanged

### `frontend/src/app/(authenticated)/admin/integrations/bling/sync-central-state.test.ts`
- Updated 2 tests to reference new label "Integrações" instead of "Sync Bling"

## Constraints Respected
- ✅ No routes or page files deleted
- ✅ No business rules, database, or sync logic altered
- ✅ Dark theme preserved (no CSS changes)
- ✅ All existing tests pass (735/735)
