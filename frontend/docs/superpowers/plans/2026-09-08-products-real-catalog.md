# Products Real Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/products` use only real catalog data from `GET /products`.

**Architecture:** `src/services/api-products.ts` maps real `Product[]` into catalog KPIs, charts and table rows. The client page renders only catalog-derived numbers and shows `N/D` for sales KPIs until order item analytics are reliable.

**Tech Stack:** Next 16 app route, React 19 client component, Vitest.

## Global Constraints

- Do not use `/analytics/products` for `/products`.
- Do not calculate revenue, margin, growth, Top SKU, concentration, sales performance or revenue share from `Product.price`.
- Show `N/D` with "Aguardando integração dos itens dos pedidos" when sales analytics are unavailable.
- Keep scope limited to Products tab; do not change sync, orders, OAuth, migrations or database.
- Render 50 products per page.

---

### Task 1: Real Catalog Mapping

**Files:**
- Modify: `src/services/api-products.ts`
- Modify: `src/features/products-executive/types/index.ts`
- Test: `src/features/products-executive/tests/products-real-catalog.test.ts`

- [ ] Write failing tests for `GET /products`, stock KPIs, average price, `N/D` sales metrics, stock/brand/category/status charts and no UUID category display.
- [ ] Implement real product mapper and summary helpers.
- [ ] Run `npm test -- src/features/products-executive/tests/products-real-catalog.test.ts`.

### Task 2: Products UI

**Files:**
- Modify: `src/features/products-executive/components/products-detail-page.tsx`
- Modify: `src/features/products-executive/components/products-detail-header.tsx`
- Replace chart components with catalog-count charts.

- [ ] Render real KPIs, notice banner, catalog charts, filters and table.
- [ ] Remove executive sales insights/recommendations from `/products` while `salesAnalytics = null`.
- [ ] Add 50-row visual pagination.

### Task 3: Remove Product Mocks

**Files:**
- Delete: `src/features/products-executive/mocks/index.ts`
- Modify or delete: `src/features/products-executive/services/products-data-service.ts`
- Modify: existing product tests.

- [ ] Remove Product mock arrays and mock service.
- [ ] Keep unrelated feature mocks untouched.

### Task 4: Verify

- [ ] Run product mock grep.
- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
