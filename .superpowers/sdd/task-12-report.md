# Task 12: Frontend period tests

## Status: DONE

## Files created
- `frontend/src/features/dashboard/tests/period-filtering.test.ts`
- `frontend/src/features/marketplace/tests/period-filtering.test.ts`

## Tests

### Dashboard tests (3 tests)
- `sends period=7d when 7d selected` — verifies default period state and hook wiring
- `period selector renders all 5 options` — verifies PERIOD_OPTIONS mapping and callbacks
- `URL contains ?period=X` — verifies period prop flows through layout

### Marketplace tests (4 tests)
- `sends period=30d when 30d selected` — verifies default period and hook usage
- `period selector renders all 5 options` — verifies all 5 buttons with aria attributes
- `changing period triggers re-fetch` — verifies useEffect depends on period
- `services send period=X to the backend` — verifies API calls include period param

## Test results
All 7 tests pass.

## Commit
`140e435` — test: add frontend period filtering tests for dashboard and marketplace
