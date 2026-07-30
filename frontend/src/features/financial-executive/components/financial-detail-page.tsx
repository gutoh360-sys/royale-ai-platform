"use client";

import { useMemo } from "react";
import { AlertCircle, TrendingUp, TrendingDown, Minus, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContentContainer } from "@/components/shell/content-container";
import { Card, CardContent } from "@/components/ui/card";
import { FinancialDetailHeader } from "./financial-detail-header";
import { FinancialDetailSkeleton } from "./financial-detail-skeleton";
import { FinancialCashFlowChart } from "./financial-cash-flow-chart";
import { useFinancialData } from "@/features/financial-executive/hooks/use-financial-data";
import { getFinancialChartData } from "@/features/financial-executive/mocks/chart-mock";
import { buildFinancialInsights, buildFinancialRecommendations } from "@/features/financial-executive/utils/financial-insights";
import { ExecutiveInsightCard } from "@/features/executive-domain/components/executive-insight-card";
import { ExecutiveRecommendationCard } from "@/features/executive-domain/components/executive-recommendation-card";
import { RevenueLineChart } from "@/features/marketplace/components/marketplace-revenue-chart";
import type { ChartDataPoint } from "@/features/marketplace/mocks/chart-mock";

function kpiTrend(value: number): { icon: typeof TrendingUp; label: string; color: string } {
  if (value > 0) return { icon: TrendingUp, label: "Crescendo", color: "text-success" };
  if (value < 0) return { icon: TrendingDown, label: "Em queda", color: "text-destructive" };
  return { icon: Minus, label: "Estavel", color: "text-muted-foreground" };
}

function buildExecutiveSummary(financial: {
  name: string;
  formattedRevenue: string;
  formattedProfit: string;
  formattedMargin: string;
  growth: number;
  health: number;
}): string {
  const healthLabel = financial.health >= 90 ? "excelente" : financial.health >= 70 ? "boa" : financial.health >= 50 ? "em atencao" : "critica";
  const growthDir = financial.growth >= 0 ? "crescimento" : "queda";
  const growthAbs = Math.abs(financial.growth);
  return `${financial.name} registrou ${financial.formattedRevenue} de receita no periodo, com ${growthDir} de ${growthAbs}% em relacao ao periodo anterior. O lucro estimado e de ${financial.formattedProfit}, com margem media de ${financial.formattedMargin}. A saude financeira encontra-se em nivel ${healthLabel} (${financial.health}/100).`;
}

export function FinancialDetailPage() {
  const { financial, status } = useFinancialData();

  const chartData: ChartDataPoint[] = useMemo(() => {
    if (!financial) return [];
    return getFinancialChartData(financial.revenue).map((d) => ({ date: d.date, revenue: d.revenue, orders: d.cashFlow }));
  }, [financial]);

  const insights = useMemo(() => {
    if (!financial) return [];
    return buildFinancialInsights(financial);
  }, [financial]);

  const recommendations = useMemo(() => {
    if (!financial) return [];
    return buildFinancialRecommendations(financial);
  }, [financial]);

  if (status === "loading" || !financial) {
    return (
      <ContentContainer>
        <FinancialDetailSkeleton />
      </ContentContainer>
    );
  }

  if (status === "error") {
    return (
      <ContentContainer>
        <div className="flex items-center justify-center gap-2 min-h-[400px]">
          <AlertCircle className="size-5 text-destructive" />
          <p className="text-sm text-muted-foreground">Erro ao carregar dados financeiros</p>
        </div>
      </ContentContainer>
    );
  }
  const summary = buildExecutiveSummary(financial);

  return (
    <ContentContainer>
      <div className="animate-in fade-in duration-300 space-y-8">
        <FinancialDetailHeader financial={financial} />

        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {summary}
            </p>
          </CardContent>
        </Card>

        <section aria-label="Indicadores financeiros">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-3">
            Indicadores
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {([
              { label: "Receita", value: financial.formattedRevenue, trend: kpiTrend(financial.growth) },
              { label: "Lucro", value: financial.formattedProfit, trend: kpiTrend(financial.growth) },
              { label: "Margem", value: financial.formattedMargin, trend: kpiTrend(financial.margin > 15 ? 1 : -1) },
              { label: "Fluxo de Caixa", value: financial.formattedCashFlow, trend: kpiTrend(financial.health >= 70 ? 1 : -1) },
              { label: "Capital de Giro", value: financial.formattedWorkingCapital, trend: kpiTrend(financial.growth >= 0 ? 1 : -1) },
              { label: "Capital Empregado", value: financial.formattedCapitalEmployed, trend: kpiTrend(financial.health >= 70 ? 1 : -1) },
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
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-3">
            Analytics
          </h2>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RevenueLineChart data={chartData} />
            </div>
            <div>
              <FinancialCashFlowChart data={getFinancialChartData(financial.revenue)} />
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
              <ExecutiveInsightCard key={i} insight={insight} index={i} />
            ))}
          </div>
        </section>

        <section aria-label="Recomendacoes">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-3">
            Recomendacoes
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {recommendations.map((rec, i) => (
              <ExecutiveRecommendationCard key={i} recommendation={rec} />
            ))}
          </div>
        </section>

        <footer className="border-t border-border/50 pt-4">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-muted-foreground">
            <span>Ultima atualizacao: {new Date(financial.lastUpdate).toLocaleString("pt-BR")}</span>
            <span>v0.8.0</span>
            <span>Fonte dos dados: Financial Intelligence</span>
          </div>
        </footer>
      </div>
    </ContentContainer>
  );
}
