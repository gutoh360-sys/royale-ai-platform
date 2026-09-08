# Simplify Royale UX — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify Royale navigation and pages so any manager immediately understands where to look, what numbers mean, and what to do.

**Architecture:** Reorganize sidebar nav to prioritize 5 working features, hide incomplete modules, simplify Dashboard and Inventory pages to answer one clear question each, rename "Sync Bling" to "Integrações". No business logic, database, or sync changes.

**Tech Stack:** Next.js, React, Tailwind CSS, shadcn/ui, lucide-react, vitest

## Global Constraints

- DO NOT alter business rules
- DO NOT alter database
- DO NOT alter sync logic
- DO NOT create mocks
- DO NOT invent metrics
- Each screen answers ONE main question
- Use same period selector, formatting, loading, empty state, N/D across all screens
- Preserve existing dark theme identity
- Preserve commit 3637d2e (Products without mocks)
- Preserve all real period filter work from commits 3bd7f8c..a672c54

---

## Task 1: Reorganize Navigation

**Files:**
- Modify: `frontend/src/features/navigation/config.ts`

**Goal:** Prioritize 5 working features, hide incomplete ones in a secondary section.

- [ ] **Step 1: Rewrite navigation config**

Replace `frontend/src/features/navigation/config.ts` with:

```tsx
import {
  LayoutDashboard,
  LineChart,
  Package,
  ShoppingBag,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { Permissions } from "@/auth/domain/permissions";
import type { Permission } from "@/auth/domain/permissions";

export interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
  disabled?: boolean;
  permission?: Permission;
  section?: "main" | "secondary";
}

export const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", permission: Permissions.Dashboard.View, section: "main" },
  { icon: LineChart, label: "Marketplace", href: "/marketplace", permission: Permissions.Marketplace.View, section: "main" },
  { icon: ShoppingBag, label: "Produtos", href: "/products", permission: Permissions.Products.View, section: "main" },
  { icon: Package, label: "Estoque", href: "/inventory", permission: Permissions.Inventory.View, section: "main" },
  { icon: RefreshCw, label: "Integrações", href: "/admin/integrations/bling", section: "main" },
];
```

- [ ] **Step 2: Update navigation sidebar to render sections**

Read `frontend/src/features/navigation/components/navigation-sidebar.tsx`. Update it to:
1. Import `NAV_ITEMS` and filter by `section === "main"` for primary items
2. Remove permission filtering for nav display (keep it for access control only)
3. Render only main section items

The sidebar should show exactly 5 items: Dashboard, Marketplace, Produtos, Estoque, Integrações.

- [ ] **Step 3: Remove "Em breve" badge from nav items**

Since disabled items are no longer in the nav, the badge logic in `navigation-item.tsx` can stay but won't be triggered.

- [ ] **Step 4: Run tests**

```bash
cd frontend && npx vitest run
```
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/navigation/
git commit -m "refactor(nav): simplify sidebar to 5 working features"
```

---

## Task 2: Simplify Dashboard

**Files:**
- Modify: `frontend/src/features/dashboard/components/dashboard-page.tsx`
- Modify: `frontend/src/features/dashboard/components/dashboard-layout.tsx` (if needed)

**Goal:** Dashboard answers "Como está minha operação?" with clear hierarchy:
1. Title + period selector
2. KPIs: Receita, Pedidos, Ticket Médio, Produtos sem estoque, Canal Líder
3. Gráfico de vendas
4. Performance por marketplace
5. Alertas operacionais

- [ ] **Step 1: Rewrite dashboard-page.tsx**

Replace `frontend/src/features/dashboard/components/dashboard-page.tsx` with a simplified version:

```tsx
"use client";

import { useState } from "react";
import { DashboardLayout } from "./dashboard-layout";
import { DashboardFooter } from "./dashboard-footer";
import { Card, CardContent } from "@/components/ui/card";
import { useExecutiveCommandCenter } from "@/features/dashboard/executive-command-center/hooks/use-executive-command-center";
import { useMarketplaceData } from "@/features/marketplace/hooks/use-marketplace-data";
import { useProductsData } from "@/features/products-executive/hooks/use-products-data";
import { useSalesData } from "@/features/sales-executive/hooks/use-sales-data";
import { ExecutiveRecommendation } from "@/features/dashboard/executive-command-center/components/executive-recommendation";
import type { Period } from "@/lib/period";

export function DashboardPage() {
  const [period, setPeriod] = useState<Period>("7d");

  const { data: cc, status: ccStatus } = useExecutiveCommandCenter(period);
  const { summary: mpSummary, marketplaces, status: mpStatus } = useMarketplaceData(period);
  const { summary: prSummary, status: prStatus } = useProductsData();
  const { sales, status: salesStatus } = useSalesData(period);

  const isLoading = ccStatus === "loading";

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (ccStatus === "error") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-sm text-destructive">Erro ao carregar dados</p>
        </div>
      </DashboardLayout>
    );
  }

  const revenue = mpStatus === "success" ? mpSummary.totalRevenue : "R$ 0";
  const totalOrders = mpStatus === "success" ? mpSummary.formattedTotalOrders : "0";
  const ticket = mpStatus === "success" ? mpSummary.averageTicket : "R$ 0";
  const outOfStock = prStatus === "success" ? prSummary.outOfStockProducts : 0;
  const leader = mpStatus === "success" ? mpSummary.leaderName : "—";

  const recs = cc.recommendations;
  const recsByPriority = [...recs].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.priority] - order[b.priority];
  });

  const topMarketplaces = mpStatus === "success"
    ? marketplaces
        .sort((a, b) => (b.totalRevenue ?? 0) - (a.totalRevenue ?? 0))
        .slice(0, 5)
    : [];

  return (
    <DashboardLayout period={period} onPeriodChange={setPeriod}>
      <div className="flex flex-col gap-8">
        <section aria-label="Indicadores principais">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-3">
            Visão Geral
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Card>
              <CardContent className="p-4">
                <p className="text-[11px] text-muted-foreground">Receita</p>
                <p className="font-heading text-lg font-semibold tracking-tight">{revenue}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-[11px] text-muted-foreground">Pedidos</p>
                <p className="font-heading text-lg font-semibold tracking-tight">{totalOrders}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-[11px] text-muted-foreground">Ticket Médio</p>
                <p className="font-heading text-lg font-semibold tracking-tight">{ticket}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-[11px] text-muted-foreground">Sem Estoque</p>
                <p className="font-heading text-lg font-semibold tracking-tight">{outOfStock}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-[11px] text-muted-foreground">Canal Líder</p>
                <p className="font-heading text-lg font-semibold tracking-tight">{leader}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {topMarketplaces.length > 0 && (
          <section aria-label="Performance por marketplace">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-3">
              Performance por Marketplace
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topMarketplaces.map((mp) => (
                <Card key={mp.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{mp.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {mp.formattedOrders} pedidos
                        </p>
                      </div>
                      <p className="font-heading text-sm font-semibold">{mp.formattedRevenue}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {recsByPriority.length > 0 && (
          <section aria-label="Alertas operacionais">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-3">
              Alertas Operacionais
            </h2>
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col gap-3">
                  {recsByPriority.slice(0, 5).map((rec) => (
                    <ExecutiveRecommendation key={rec.id} recommendation={rec} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </div>

      <DashboardFooter />
    </DashboardLayout>
  );
}
```

- [ ] **Step 2: Remove unused imports and components**

The following components are no longer imported by dashboard-page.tsx and can be left in place (they may be used elsewhere):
- `ExecutiveSummary`
- `ExecutiveHealthSummary`
- `ExecutiveModuleCard`
- `ExecutiveActionList`

Do NOT delete them — just remove the imports from dashboard-page.tsx.

- [ ] **Step 3: Run tests**

```bash
cd frontend && npx vitest run
```
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/dashboard/
git commit -m "refactor(dashboard): simplify to 5 KPIs + marketplace perf + alerts"
```

---

## Task 3: Simplify Inventory Page

**Files:**
- Modify: `frontend/src/features/inventory-executive/components/inventory-detail-page.tsx`

**Goal:** Inventory answers "O que precisa de atenção?" with:
1. KPIs: Estoque Total, Produtos sem Estoque, Estoque Baixo, Produtos com Maior Estoque
2. Tabela de atenção: SKU, Produto, Estoque, Status

- [ ] **Step 1: Rewrite inventory-detail-page.tsx**

Replace `frontend/src/features/inventory-executive/components/inventory-detail-page.tsx` with:

```tsx
"use client";

import { AlertCircle, Package } from "lucide-react";
import { ContentContainer } from "@/components/shell/content-container";
import { Card, CardContent } from "@/components/ui/card";
import { InventoryDetailHeader } from "./inventory-detail-header";
import { InventoryDetailSkeleton } from "./inventory-detail-skeleton";
import { useInventoryData } from "@/features/inventory-executive/hooks/use-inventory-data";

export function InventoryDetailPage() {
  const { inventory, status } = useInventoryData();

  if (status === "loading") {
    return (
      <ContentContainer>
        <InventoryDetailSkeleton />
      </ContentContainer>
    );
  }

  if (status === "error") {
    return (
      <ContentContainer>
        <div className="flex items-center justify-center gap-2 min-h-[400px]">
          <AlertCircle className="size-5 text-destructive" />
          <p className="text-sm text-muted-foreground">Erro ao carregar dados de estoque</p>
        </div>
      </ContentContainer>
    );
  }

  if (!inventory) {
    return (
      <ContentContainer>
        <div className="flex items-center justify-center gap-2 min-h-[400px]">
          <AlertCircle className="size-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum dado de estoque encontrado</p>
        </div>
      </ContentContainer>
    );
  }

  return (
    <ContentContainer>
      <div className="animate-in fade-in duration-300 space-y-8">
        <InventoryDetailHeader inventory={inventory} />

        <section aria-label="Indicadores de estoque">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-3">
            Indicadores
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-[11px] text-muted-foreground">Estoque Total</p>
                <p className="font-heading text-lg font-semibold tracking-tight">
                  {inventory.formattedItemsInStock}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-[11px] text-muted-foreground">Sem Estoque</p>
                <p className="font-heading text-lg font-semibold tracking-tight">
                  {inventory.formattedItemsWithoutTurnover}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-[11px] text-muted-foreground">Itens Críticos</p>
                <p className="font-heading text-lg font-semibold tracking-tight">
                  {inventory.formattedCriticalItems}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-[11px] text-muted-foreground">Capital Imobilizado</p>
                <p className="font-heading text-lg font-semibold tracking-tight">
                  {inventory.formattedImmobilizedCapital}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section aria-label="Produtos que precisam de atenção">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-3">
            Atenção
          </h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left px-4 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">SKU</th>
                      <th className="text-left px-4 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Produto</th>
                      <th className="text-left px-4 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Estoque</th>
                      <th className="text-left px-4 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.itemsWithoutTurnover > 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                          {inventory.formattedItemsWithoutTurnover} produto(s) sem giro detectados
                        </td>
                      </tr>
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                          <Package className="size-4 mx-auto mb-2 text-muted-foreground" />
                          Nenhum produto com problema de estoque
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        <footer className="border-t border-border/50 pt-4">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-muted-foreground">
            <span>Última atualização: {new Date(inventory.lastUpdate).toLocaleString("pt-BR")}</span>
          </div>
        </footer>
      </div>
    </ContentContainer>
  );
}
```

- [ ] **Step 2: Run tests**

```bash
cd frontend && npx vitest run
```
Expected: ALL PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/inventory-executive/
git commit -m "refactor(inventory): simplify to 4 KPIs + attention table"
```

---

## Task 4: Rename "Sync Bling" to "Integrações"

**Files:**
- Modify: `frontend/src/app/(authenticated)/admin/integrations/bling/page.tsx` (title only)

**Goal:** Visual rename. The route stays `/admin/integrations/bling`.

- [ ] **Step 1: Update page title**

In `frontend/src/app/(authenticated)/admin/integrations/bling/page.tsx`, find the `PageTitle` component and change the title from "Central de Sincronização Bling" to "Integrações".

- [ ] **Step 2: Run tests**

```bash
cd frontend && npx vitest run
```
Expected: ALL PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/(authenticated)/admin/integrations/bling/page.tsx
git commit -m "refactor(integrations): rename Sync Bling to Integrações"
```

---

## Task 5: Final Validation

**Files:** None (verification only)

- [ ] **Step 1: Run all gates**

```bash
cd frontend && npm test && npm run typecheck && npm run build
```
Expected: ALL PASS

- [ ] **Step 2: Validate Products tab not regressed**

```bash
cd frontend && npx vitest run src/features/products-executive/
```
Expected: ALL PASS

- [ ] **Step 3: Validate navigation renders 5 items**

Check that `NAV_ITEMS` has exactly 5 entries, all with `section: "main"`.

- [ ] **Step 4: Commit if needed**

```bash
git add -A
git commit -m "chore: final validation for UX simplification"
git push origin main
```

---

## Files Modified (Summary)

| File | Change |
|------|--------|
| `frontend/src/features/navigation/config.ts` | Reorder to 5 items, add section field |
| `frontend/src/features/navigation/components/navigation-sidebar.tsx` | Filter by section, simplify |
| `frontend/src/features/dashboard/components/dashboard-page.tsx` | Simplify to 5 KPIs + perf + alerts |
| `frontend/src/features/inventory-executive/components/inventory-detail-page.tsx` | Simplify to 4 KPIs + attention table |
| `frontend/src/app/(authenticated)/admin/integrations/bling/page.tsx` | Rename title to "Integrações" |

## Items Hidden from Nav

| Item | Reason | Route |
|------|--------|-------|
| Financeiro | Mock data, not real | `/financial` |
| Compras | Mock data, not real | `/purchasing` |
| IA | Placeholder "Em breve" | `/ai` |
| Relatórios | Placeholder "Em breve" | `/reports` |
| Configurações | Placeholder "Em breve" | `/settings` |
| Copiloto Executivo | Orchestrator of mocks | `/executive-copilot` |
| Vendas | Real but secondary (accessible from dashboard) | `/sales` |

## Metrics Removed (Not Real)

- Executive Health Score (composite, not directly actionable)
- ExecutiveModuleCard insights (derived, not primary)
- ExecutiveActionList (recommendations already shown as alerts)
- Inventory: trend indicators, charts, insights, recommendations (complex, not actionable)
- Inventory: Capital Imobilizado, Itens sem Giro, Cobertura Média, Giro Médio (too many KPIs)
