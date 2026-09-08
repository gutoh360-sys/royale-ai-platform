# Task 13: Hardcode sweep and cleanup

**Files:** Various

**Steps:**

1. Search for remaining hardcodes
2. Remove/fix each one
3. Remove chart-mock.ts if replaced
4. Run full test suites
5. Commit

**Search for these patterns:**
- `days=7`, `days=30`, `days=90`
- `365` (used in periodToDays for 12m)
- `mockPeriod`, `fakePeriod`
- `new Date("2026` (hardcoded dates)

**Known issues to fix:**
- `api-analytics.ts` has hardcoded `?days=30` - should accept period param
- `chart-mock.ts` has hardcoded `new Date("2026-07-27")` - should be removed or replaced

**After cleanup:**
- Run `cd frontend && npm test && npm run typecheck && npm run build`
- Verify all tests pass
- Verify typecheck passes
- Verify build succeeds

**Work from:** `C:\Users\gutod\Documents\royale-platform`

**Report file:** `C:\Users\gutod\Documents\royale-platform\.superpowers\sdd\task-13-report.md`
