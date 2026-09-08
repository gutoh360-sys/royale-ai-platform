"use client";

import { useState } from "react";
import { DashboardLayout } from "./dashboard-layout";
import { DashboardFooter } from "./dashboard-footer";
import { Card, CardContent } from "@/components/ui/card";
import { useExecutiveCommandCenter } from "@/features/dashboard/executive-command-center/hooks/use-executive-command-center";
import { useMarketplaceData } from "@/features/marketplace/hooks/use-marketplace-data";
import { useProductsData } from "@/features/products-executive/hooks/use-products-data";
import { ExecutiveRecommendation } from "@/features/dashboard/executive-command-center/components/executive-recommendation";
import type { Period } from "@/lib/period";

export function DashboardPage() {
  const [period, setPeriod] = useState<Period>("7d");

  const { data: cc, status: ccStatus } = useExecutiveCommandCenter(period);
  const { summary: mpSummary, marketplaces, status: mpStatus } = useMarketplaceData(period);
  const { summary: prSummary, status: prStatus } = useProductsData();

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
        .sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0))
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
