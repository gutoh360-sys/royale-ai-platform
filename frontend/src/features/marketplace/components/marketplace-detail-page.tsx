"use client";

import { useState, useMemo } from "react";
import { Loader2, AlertCircle, Table2, Lightbulb, TrendingUp, TrendingDown, Minus, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContentContainer } from "@/components/shell/content-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketplaceDetailHeader } from "./marketplace-detail-header";
import { MarketplaceDetailSkeleton } from "./marketplace-detail-skeleton";
import { MarketplaceHealthScore } from "./marketplace-health-score";
import { MarketplaceNextActions } from "./marketplace-next-actions";
import { useMarketplaceData } from "@/features/marketplace/hooks/use-marketplace-data";
import { getHealthConfig } from "@/features/marketplace/utils/health";
import { RevenueLineChart } from "./marketplace-revenue-chart";
import { OrdersBarChart } from "./marketplace-orders-chart";
import { getChartData } from "@/features/marketplace/mocks/chart-mock";
import { ExecutiveInsightCard } from "@/features/executive-domain/components/executive-insight-card";
import { ExecutiveRecommendationCard } from "@/features/executive-domain/components/executive-recommendation-card";
import { buildInsights, buildRecommendations, getInsightPriority, buildNextActions } from "@/features/marketplace/utils/insights";


function kpiTrend(value: number): { icon: typeof TrendingUp; label: string; color: string } {
  if (value > 0) return { icon: TrendingUp, label: "Crescendo", color: "text-success" };
  if (value < 0) return { icon: TrendingDown, label: "Em queda", color: "text-destructive" };
  return { icon: Minus, label: "Estável", color: "text-muted-foreground" };
}

const PERIODS = ["7 dias", "30 dias", "90 dias", "12 meses"] as const;

function buildExecutiveSummary(marketplace: {
  name: string;
  formattedRevenue: string;
  formattedMarketShare: string;
  growth: number;
  health: number;
}): string {
  const healthLabel = getHealthConfig(marketplace.health).label.toLowerCase();
  const growthDir = marketplace.growth >= 0 ? "crescimento" : "queda";
  const growthAbs = Math.abs(marketplace.growth);
  return `${marketplace.name} permanece como principal canal da operação, representando ${marketplace.formattedMarketShare} do faturamento total. O canal registrou ${marketplace.formattedRevenue} em receita no período, com ${growthDir} de ${growthAbs}% em relação ao período anterior. A saúde operacional encontra-se em nível ${healthLabel} (${marketplace.health}/100).`;
}

const TOP_PRODUCTS_PLACEHOLDER = [
  { name: "Carregador Turbo 45W", revenue: "R$ 18.100", orders: 215, share: "12,7%" },
  { name: "Fone Bluetooth Pro", revenue: "R$ 15.600", orders: 142, share: "11,0%" },
  { name: "SmartBand X", revenue: "R$ 12.400", orders: 98, share: "8,7%" },
  { name: "Mouse Vertical", revenue: "R$ 8.200", orders: 186, share: "5,8%" },
] as const;

interface MarketplaceDetailPageProps {
  slug: string;
}

export function MarketplaceDetailPage({ slug }: MarketplaceDetailPageProps) {
  const { marketplaces, status } = useMarketplaceData();
  const [activePeriod, setActivePeriod] = useState<string>("30 dias");

  const marketplace = useMemo(
    () => marketplaces.find((mp) => mp.id === slug),
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

        <MarketplaceHealthScore score={marketplace.health} />

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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {([
              { label: "Receita", value: marketplace.formattedRevenue, trend: kpiTrend(marketplace.growth) },
              { label: "Pedidos", value: marketplace.formattedOrders, trend: kpiTrend(marketplace.growth >= 0 ? 1 : -1) },
              { label: "Ticket Médio", value: marketplace.formattedAverageTicket, trend: kpiTrend(marketplace.growth) },
              { label: "Participação", value: marketplace.formattedMarketShare, trend: kpiTrend(marketplace.marketShare > 20 ? 1 : -1) },
              { label: "Saúde", value: `${marketplace.health}/100`, trend: kpiTrend(marketplace.health >= 70 ? 1 : -1) },
              { label: "Crescimento", value: `${marketplace.growth >= 0 ? "+" : ""}${marketplace.growth}%`, trend: kpiTrend(marketplace.growth) },
            ]).map((kpi) => {
              const TrendIcon = kpi.trend.icon;
              return (
                <Card key={kpi.label}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
                      <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-medium", kpi.trend.color)}>
                        <TrendIcon className="size-3" aria-hidden="true" />
                        {kpi.trend.label}
                      </span>
                    </div>
                    <p className="font-heading text-lg font-semibold tracking-tight">{kpi.value}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
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

        <section aria-label="Top produtos">
          <div className="flex items-center gap-2 mb-3">
            <Table2 className="size-3.5 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em]">
              Top Produtos
            </h2>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" role="table" aria-label="Produtos mais vendidos">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Produto</th>
                      <th className="px-4 py-3 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Receita</th>
                      <th className="px-4 py-3 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Pedidos</th>
                      <th className="px-4 py-3 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Participação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TOP_PRODUCTS_PLACEHOLDER.map((product, i) => (
                      <tr key={product.name} className="border-b border-border/30 last:border-0 transition-colors hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground tabular-nums w-5">{i + 1}.</span>
                            <span className="font-medium">{product.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium tabular-nums">{product.revenue}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{product.orders}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{product.share}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2 border-t border-border/30">
                <p className="text-[11px] text-muted-foreground text-center">
                  Dados ilustrativos — aguardando integração com dados reais do canal.
                </p>
              </div>
            </CardContent>
          </Card>
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
