# Task 12: Frontend period tests

**Files:**
- Create: `frontend/src/features/marketplace/tests/period-filtering.test.ts`
- Create: `frontend/src/features/dashboard/tests/period-filtering.test.ts`

**Steps:**

1. Write tests
2. Run tests
3. Commit

**Test requirements:**

Dashboard tests (`frontend/src/features/dashboard/tests/period-filtering.test.ts`):
- Dashboard sends `period=7d` when 7d selected
- Period selector renders all 5 options
- URL contains `?period=X`

Marketplace tests (`frontend/src/features/marketplace/tests/period-filtering.test.ts`):
- Marketplace sends `period=30d` when 30d selected
- Period selector renders all 5 options
- Changing period triggers re-fetch

**Work from:** `C:\Users\gutod\Documents\royale-platform\frontend`

**Report file:** `C:\Users\gutod\Documents\royale-platform\.superpowers\sdd\task-12-report.md`
