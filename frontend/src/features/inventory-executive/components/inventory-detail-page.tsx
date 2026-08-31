"use client";

import { useMemo } from "react";
import { AlertCircle, TrendingUp, TrendingDown, Minus, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContentContainer } from "@/components/shell/content-container";
import { Card, CardContent } from "@/components/ui/card";
import { InventoryDetailHeader } from "./inventory-detail-header";
import { InventoryDetailSkeleton } from "./inventory-detail-skeleton";
import { InventoryStockEvolutionChart } from "./inventory-stock-evolution-chart";
import { InventoryCapitalDistributionChart } from "./inventory-capital-distribution-chart";
import { useInventoryData } from "@/features/inventory-executive/hooks/use-inventory-data";
import { getInventoryChartData } from "@/features/inventory-executive/mocks/chart-mock";
import { buildInventoryInsights, buildInventoryRecommendations } from "@/features/inventory-executive/utils/inventory-insights";
import { ExecutiveInsightCard } from "@/features/executive-domain/components/executive-insight-card";
import { ExecutiveRecommendationCard } from "@/features/executive-domain/components/executive-recommendation-card";

function kpiTrend(value: number): { icon: typeof TrendingUp; label: string; color: string } {
  if (value > 0) return { icon: TrendingUp, label: "Crescendo", color: "text-success" };
  if (value < 0) return { icon: TrendingDown, label: "Em queda", color: "text-destructive" };
  return { icon: Minus, label: "Estavel", color: "text-muted-foreground" };
}

function buildExecutiveSummary(inventory: {
  name: string;
  health: number;
  itemsInStock: number;
  formattedItemsInStock: string;
  formattedImmobilizedCapital: string;
  formattedAverageCoverage: string;
  formattedAverageTurnover: string;
}): string {
  const healthLabel = inventory.health >= 90 ? "excelente" : inventory.health >= 70 ? "boa" : inventory.health >= 50 ? "em atencao" : "critica";
  return `${inventory.name} possui ${inventory.formattedItemsInStock} itens em estoque, com capital imobilizado de ${inventory.formattedImmobilizedCapital}. A cobertura media e de ${inventory.formattedAverageCoverage} com giro de ${inventory.formattedAverageTurnover}. A saude do estoque encontra-se em nivel ${healthLabel} (${inventory.health}/100).`;
}

export function InventoryDetailPage() {
  const { inventory, status } = useInventoryData();

  const chartData = useMemo(() => {
    if (!inventory) return [];
    return getInventoryChartData(inventory.itemsInStock, inventory.immobilizedCapital);
  }, [inventory]);

  const insightInput = useMemo(() => {
    if (!inventory) return null;
    return {
      summary: inventory.summary,
      formattedImmobilizedCapital: inventory.formattedImmobilizedCapital,
      formattedAverageCoverage: inventory.formattedAverageCoverage,
      formattedAverageTurnover: inventory.formattedAverageTurnover,
    };
  }, [inventory]);

  const insights = useMemo(() => {
    if (!insightInput) return [];
    return buildInventoryInsights(insightInput);
  }, [insightInput]);

  const recommendations = useMemo(() => {
    if (!insightInput) return [];
    return buildInventoryRecommendations(insightInput);
  }, [insightInput]);

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

  const summary = buildExecutiveSummary(inventory);

  return (
    <ContentContainer>
      <div className="animate-in fade-in duration-300 space-y-8">
        <InventoryDetailHeader inventory={inventory} />

        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {summary}
            </p>
          </CardContent>
        </Card>

        <section aria-label="Indicadores de estoque">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-3">
            Indicadores
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {([
              { label: "Capital Imobilizado", value: inventory.formattedImmobilizedCapital, trend: kpiTrend(inventory.immobilizedCapital > 100000 ? -1 : 1) },
              { label: "Itens em Estoque", value: inventory.formattedItemsInStock, trend: kpiTrend(inventory.utilizationRate < 80 ? 1 : -1) },
              { label: "Itens sem Giro", value: inventory.formattedItemsWithoutTurnover, trend: kpiTrend(inventory.itemsWithoutTurnover > 0 ? -1 : 1) },
              { label: "Itens Criticos", value: inventory.formattedCriticalItems, trend: kpiTrend(inventory.criticalItems > 0 ? -1 : 1) },
              { label: "Cobertura Media", value: inventory.formattedAverageCoverage, trend: kpiTrend(inventory.averageCoverage >= 30 ? 1 : -1) },
              { label: "Giro Medio", value: inventory.formattedAverageTurnover, trend: kpiTrend(inventory.averageTurnover >= 4 ? 1 : -1) },
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
              <InventoryStockEvolutionChart data={chartData} />
            </div>
            <div>
              <InventoryCapitalDistributionChart data={chartData} />
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
            <span>Ultima atualizacao: {new Date(inventory.lastUpdate).toLocaleString("pt-BR")}</span>
            <span>v0.8.2</span>
            <span>Fonte dos dados: Inventory Intelligence</span>
          </div>
        </footer>
      </div>
    </ContentContainer>
  );
}
