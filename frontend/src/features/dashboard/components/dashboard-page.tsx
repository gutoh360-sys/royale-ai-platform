"use client";

import { useState } from "react";
import { DashboardLayout } from "./dashboard-layout";
import { DashboardFooter } from "./dashboard-footer";
import { ExecutiveSummary } from "@/features/dashboard/executive-summary/components/executive-summary";
import { ExecutiveRecommendation } from "@/features/dashboard/executive-command-center/components/executive-recommendation";
import { ExecutiveHealthSummary } from "./executive-health-summary";
import { ExecutiveModuleCard } from "./executive-module-card";
import { ExecutiveActionList } from "./executive-action-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { useExecutiveCommandCenter } from "@/features/dashboard/executive-command-center/hooks/use-executive-command-center";
import { useMarketplaceData } from "@/features/marketplace/hooks/use-marketplace-data";
import { useInventoryData } from "@/features/inventory-executive/hooks/use-inventory-data";
import { useSalesData } from "@/features/sales-executive/hooks/use-sales-data";
import { useProductsData } from "@/features/products-executive/hooks/use-products-data";
import type { ActionItem } from "./executive-action-list";
import type { AnalyticsPeriodDays } from "@/types/api";

export function DashboardPage() {
  const [days, setDays] = useState<AnalyticsPeriodDays>(7);

  const { data: cc, status: ccStatus } = useExecutiveCommandCenter(days);
  const { summary: mpSummary, status: mpStatus } = useMarketplaceData();
  const { inventory, status: invStatus } = useInventoryData(days);
  const { sales, status: salesStatus } = useSalesData(days);
  const { summary: prSummary, status: prStatus } = useProductsData();

  const isLoading = ccStatus === "loading";
  const isError = ccStatus === "error";

  if (isLoading) {
    return (
      <DashboardLayout>
        <ExecutiveSummary state="loading" />
      </DashboardLayout>
    );
  }

  if (isError) {
    return (
      <DashboardLayout>
        <ExecutiveSummary state="error" />
      </DashboardLayout>
    );
  }

  const recs = cc.recommendations;
  const recsByPriority = [...recs].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.priority] - order[b.priority];
  });

  const actions: ActionItem[] = cc.recommendations.map((rec) => ({
    id: rec.id,
    description: rec.action,
    reason: `${rec.reason} — ${rec.impact}`,
    priority: rec.priority,
    origin: rec.action.toLowerCase().includes("preço") || rec.action.toLowerCase().includes("financeiro")
      ? "financial"
      : rec.action.toLowerCase().includes("anúncio") || rec.action.toLowerCase().includes("catálogo")
        ? "marketplace"
        : "executive" as const,
  }));

  const mpRevenue = mpStatus === "success" ? mpSummary.totalRevenue : "R$ 0";
  const mpHealth = mpStatus === "success" ? mpSummary.averageHealth : 0;
  const mpInsight = mpStatus === "success" && mpSummary.highestGrowth !== 0
    ? `${mpSummary.highestGrowthName} cresceu ${mpSummary.highestGrowth}% este período`
    : "Carregando...";
  const invCapital = invStatus === "success" && inventory ? inventory.formattedStockValue : "R$ 0";
  const invHealth = invStatus === "success" && inventory ? inventory.health : 0;
  const invItemsWithStock = invStatus === "success" && inventory ? inventory.itemsInStock : 0;
  const invItemsTotal = invStatus === "success" && inventory ? inventory.totalCapacity : 0;
  const invInsight = invStatus === "success" && inventory
    ? `${invItemsWithStock} de ${invItemsTotal} produtos com estoque`
    : "Carregando...";
  const salesRevenue = salesStatus === "success" && sales ? sales.formattedRevenue : "R$ 0";
  const salesHealth = salesStatus === "success" && sales ? sales.health : 0;
  const salesInsight = salesStatus === "success" && sales
    ? `Receita de ${sales.formattedRevenue}, ${sales.formattedOrders} pedidos`
    : "Carregando...";

  return (
    <DashboardLayout days={days} onDaysChange={setDays}>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-8">
          <ExecutiveHealthSummary
            score={cc.status.healthScore}
            label={cc.status.label}
            summary={cc.status.summary}
          />

          <section aria-label="Resumo dos modulos">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-3">
              Resumo dos Modulos
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2">
              <ExecutiveModuleCard
                name="Marketplace"
                icon="M"
                href="/marketplace"
                kpi={mpRevenue}
                kpiLabel="Receita total"
                insight={mpInsight}
                priority={mpHealth >= 80 ? "baixa" : mpHealth >= 60 ? "media" : "alta"}
                enabled={mpStatus === "success"}
              />
              <ExecutiveModuleCard
                name="Estoque"
                icon="E"
                href="/inventory"
                kpi={invCapital}
                kpiLabel="Valor em estoque"
                insight={invInsight}
                priority={invHealth >= 80 ? "baixa" : invHealth >= 60 ? "media" : "alta"}
                enabled={invStatus === "success"}
              />
              <ExecutiveModuleCard
                name="Produtos"
                icon="P"
                href="/products"
                kpi={prSummary.totalRevenue}
                kpiLabel="Receita total"
                insight={`${prSummary.activeProducts} produtos ativos`}
                priority={prSummary.health >= 80 ? "baixa" : prSummary.health >= 60 ? "media" : "alta"}
                enabled={prStatus === "success"}
              />
              <ExecutiveModuleCard
                name="Vendas"
                icon="V"
                href="/sales"
                kpi={salesRevenue}
                kpiLabel="Receita total"
                insight={salesInsight}
                priority={salesHealth >= 80 ? "baixa" : salesHealth >= 60 ? "media" : "alta"}
                enabled={salesStatus === "success"}
              />
            </div>
          </section>

          <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
            <section aria-label="Prioridades do dia">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-3">
                Prioridades do Dia
              </h2>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="size-4 text-warning" aria-hidden="true" />
                    Prioridades
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recsByPriority.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {recsByPriority.map((rec) => (
                        <ExecutiveRecommendation key={rec.id} recommendation={rec} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma prioridade no momento.</p>
                  )}
                </CardContent>
              </Card>
            </section>

            <div className="flex flex-col gap-8">
              <ExecutiveActionList actions={actions} />
            </div>
          </div>
        </div>
      </div>

      <DashboardFooter />
    </DashboardLayout>
  );
}
