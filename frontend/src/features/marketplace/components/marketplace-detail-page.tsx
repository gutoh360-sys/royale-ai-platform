"use client";

import { useState, useMemo } from "react";
import { AlertCircle, Lightbulb, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContentContainer } from "@/components/shell/content-container";
import { Card, CardContent } from "@/components/ui/card";
import { MarketplaceDetailHeader } from "./marketplace-detail-header";
import { MarketplaceDetailSkeleton } from "./marketplace-detail-skeleton";
import { MarketplaceHealthScore } from "./marketplace-health-score";
import { MarketplaceNextActions } from "./marketplace-next-actions";
import { useMarketplaceData } from "@/features/marketplace/hooks/use-marketplace-data";
import { RevenueLineChart } from "./marketplace-revenue-chart";
import { OrdersBarChart } from "./marketplace-orders-chart";
import { getChartData } from "@/features/marketplace/mocks/chart-mock";
import { ExecutiveInsightCard } from "@/features/executive-domain/components/executive-insight-card";
import { ExecutiveRecommendationCard } from "@/features/executive-domain/components/executive-recommendation-card";
import { buildInsights, buildRecommendations, getInsightPriority, buildNextActions } from "@/features/marketplace/utils/insights";

const PERIODS = ["7 dias", "30 dias", "90 dias", "12 meses"] as const;

function buildExecutiveSummary(marketplace: {
  name: string;
  formattedRevenue: string;
  formattedMarketShare: string;
  growth: number;
  health: number;
  channelCount: number;
}): string {
  const channelLabel = marketplace.channelCount > 1
    ? `${marketplace.channelCount} conexões`
    : "1 conexão";
  return `${marketplace.name} opera com ${channelLabel}. A saúde operacional encontra-se em nível ${marketplace.health === 100 ? "conectado" : "pausado"} (${marketplace.channelCount} canais ativos).`;
}

interface MarketplaceDetailPageProps {
  slug: string;
}

export function MarketplaceDetailPage({ slug }: MarketplaceDetailPageProps) {
  const { marketplaces, status } = useMarketplaceData();
  const [activePeriod, setActivePeriod] = useState<string>("30 dias");

  const marketplace = useMemo(
    () => marketplaces.find((mp) => mp.slug === slug),
    [marketplaces, slug],
  );

  const chartData = useMemo(() => {
    if (!marketplace) return [];
    return getChartData(marketplace.revenue, marketplace.orders);
  }, [marketplace]);

  const insights = useMemo(() => {
    if (!marketplace) return [];
    return buildInsights(marketplace);
  }, [marketplace]);

  const recommendations = useMemo(() => {
    if (!marketplace) return [];
    return buildRecommendations(marketplace);
  }, [marketplace]);

  const priorities = useMemo(() => {
    if (!marketplace) return [];
    return getInsightPriority(marketplace);
  }, [marketplace]);

  const nextActions = useMemo(() => {
    if (!marketplace) return [];
    return buildNextActions(marketplace);
  }, [marketplace]);

  if (status === "loading") {
    return (
      <ContentContainer>
        <MarketplaceDetailSkeleton />
      </ContentContainer>
    );
  }

  if (status === "error") {
    return (
      <ContentContainer>
        <div className="flex items-center justify-center gap-2 min-h-[400px]">
          <AlertCircle className="size-5 text-destructive" />
          <p className="text-sm text-muted-foreground">Erro ao carregar dados do marketplace</p>
        </div>
      </ContentContainer>
    );
  }

  if (!marketplace) {
    return (
      <ContentContainer>
        <div className="flex items-center justify-center gap-2 min-h-[400px]">
          <AlertCircle className="size-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Marketplace não encontrado</p>
        </div>
      </ContentContainer>
    );
  }

  const summary = buildExecutiveSummary(marketplace);
  const hasMetrics = marketplace.orders > 0;

  return (
    <ContentContainer>
      <div className="animate-in fade-in duration-300 space-y-8">
        <MarketplaceDetailHeader marketplace={marketplace} />

        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {summary}
            </p>
          </CardContent>
        </Card>

        {marketplace.health !== 100 && marketplace.health !== 0 && (
          <MarketplaceHealthScore score={marketplace.health} />
        )}

        <section aria-label="Indicadores do marketplace">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em]">
              Indicadores
            </h2>
            <div className="flex items-center gap-1 rounded-lg border p-0.5" role="tablist" aria-label="Selecionar período">
              {PERIODS.map((period) => (
                <button
                  key={period}
                  onClick={() => setActivePeriod(period)}
                  role="tab"
                  aria-selected={activePeriod === period}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                    activePeriod === period
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {([
              { label: "Receita", value: hasMetrics ? marketplace.formattedRevenue : "—" },
              { label: "Pedidos", value: hasMetrics ? marketplace.formattedOrders : "—" },
              { label: "Ticket Médio", value: hasMetrics ? marketplace.formattedAverageTicket : "—" },
              { label: "Conexões", value: String(marketplace.channelCount) },
            ]).map((kpi) => (
              <Card key={kpi.label}>
                <CardContent className="p-4">
                  <p className="text-[11px] text-muted-foreground mb-1">{kpi.label}</p>
                  <p className="font-heading text-lg font-semibold tracking-tight">{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section aria-label="Conexões">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-3">
            Conexões
          </h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" role="table" aria-label="Conexões do marketplace">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Nome</th>
                      <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Bling ID</th>
                      <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Tipo</th>
                      <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Última sync</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marketplace.channels.map((channel) => (
                      <tr key={channel.id} className="border-b border-border/30 last:border-0 transition-colors hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">{channel.name}</td>
                        <td className="px-4 py-3 tabular-nums text-muted-foreground">{channel.bling_id}</td>
                        <td className="px-4 py-3 text-muted-foreground">{channel.tipo ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "inline-flex items-center gap-1 text-xs font-medium",
                            channel.situacao === 0 ? "text-warning" : "text-success",
                          )}>
                            {channel.situacao === 0 ? "Pausado" : "Ativo"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {channel.last_synced_at
                            ? new Date(channel.last_synced_at).toLocaleString("pt-BR")
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        <section aria-label="Analytics">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em]">
              Analytics
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RevenueLineChart data={chartData} />
            </div>
            <div>
              <OrdersBarChart data={chartData} />
            </div>
          </div>
        </section>

        <section aria-label="Executive Insights">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="size-3.5 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em]">
              Executive Insights
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {insights.map((insight, i) => (
              <ExecutiveInsightCard key={i} insight={insight} index={i} priority={priorities[i]} />
            ))}
          </div>
        </section>

        <section aria-label="Recomendações">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em]">
              Recomendações
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {recommendations.map((rec, i) => (
              <ExecutiveRecommendationCard key={i} recommendation={rec} />
            ))}
          </div>
        </section>

        <section aria-label="Próximas ações">
          <div className="flex items-center gap-2 mb-3">
            <ListChecks className="size-3.5 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em]">
              Próximas Ações
            </h2>
          </div>
          <MarketplaceNextActions actions={nextActions} />
        </section>

        <footer className="border-t border-border/50 pt-4">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-muted-foreground">
            <span>Última atualização: {new Date(marketplace.lastUpdate).toLocaleString("pt-BR")}</span>
            <span>v0.8.0</span>
            <span>Fonte dos dados: Marketplace Intelligence</span>
          </div>
        </footer>
      </div>
    </ContentContainer>
  );
}
