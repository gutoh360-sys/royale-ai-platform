"use client"

import { useMemo } from "react"
import { AlertCircle, TrendingUp, TrendingDown, Minus, Lightbulb } from "lucide-react"
import { cn } from "@/lib/utils"
import { ContentContainer } from "@/components/shell/content-container"
import { Card, CardContent } from "@/components/ui/card"
import { PurchasingDetailHeader } from "./purchasing-detail-header"
import { PurchasingDetailSkeleton } from "./purchasing-detail-skeleton"
import { PurchaseDemandChart } from "./purchase-demand-chart"
import { SupplierDistributionChart } from "./supplier-distribution-chart"
import { usePurchasingData } from "@/features/purchasing-executive/hooks/use-purchasing-data"
import { buildPurchasingInsights, buildPurchasingRecommendations } from "@/features/purchasing-executive/utils/purchasing-insights"
import { ExecutiveInsightCard } from "@/features/executive-domain/components/executive-insight-card"
import { ExecutiveRecommendationCard } from "@/features/executive-domain/components/executive-recommendation-card"

function kpiTrend(value: number, positive: boolean): { icon: typeof TrendingUp; label: string; color: string } {
  if (value > 0 && positive) return { icon: TrendingUp, label: "Positivo", color: "text-success" }
  if (value > 0 && !positive) return { icon: TrendingDown, label: "Atenção", color: "text-destructive" }
  if (value < 0 && !positive) return { icon: TrendingUp, label: "Positivo", color: "text-success" }
  if (value === 0) return { icon: Minus, label: "Estável", color: "text-muted-foreground" }
  return { icon: TrendingDown, label: "Negativo", color: "text-destructive" }
}

export function PurchasingDetailPage() {
  const { categories, suppliers, summary, status } = usePurchasingData()

  const insightInput = useMemo(() => {
    return {
      categories: categories.map((c) => ({
        name: c.name,
        productsToBuy: c.productsToBuy,
        totalUnits: c.totalUnits,
        estimatedInvestment: c.estimatedInvestment,
        formattedInvestment: c.formattedInvestment,
        averageCoverage: c.averageCoverage,
        priority: c.priority,
      })),
      suppliers: suppliers.map((s) => ({
        name: s.name,
        share: s.share,
        formattedShare: s.formattedShare,
        leadTimeDays: s.leadTimeDays,
        activeOrders: s.activeOrders,
        reliability: s.reliability,
      })),
      totalCapital: summary.capitalInPurchases,
      averageCoverage: summary.averageCoverage,
      averageLeadTime: summary.averageLeadTime,
      productsToReplenish: summary.productsToReplenish,
      totalUnitsToBuy: summary.totalUnitsToBuy,
    }
  }, [categories, suppliers, summary])

  const insights = useMemo(() => buildPurchasingInsights(insightInput), [insightInput])
  const recommendations = useMemo(() => buildPurchasingRecommendations(insightInput), [insightInput])

  if (status === "loading") {
    return (
      <ContentContainer>
        <PurchasingDetailSkeleton />
      </ContentContainer>
    )
  }

  if (status === "error") {
    return (
      <ContentContainer>
        <div className="flex items-center justify-center gap-2 min-h-[400px]">
          <AlertCircle className="size-5 text-destructive" />
          <p className="text-sm text-muted-foreground">Erro ao carregar dados de abastecimento</p>
        </div>
      </ContentContainer>
    )
  }

  if (categories.length === 0) {
    return (
      <ContentContainer>
        <div className="flex items-center justify-center gap-2 min-h-[400px]">
          <AlertCircle className="size-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum dado de abastecimento disponível</p>
        </div>
      </ContentContainer>
    )
  }

  return (
    <ContentContainer>
      <div className="animate-in fade-in duration-300 space-y-8">
        <PurchasingDetailHeader summary={summary} />

        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {summary.productsToReplenish} produtos necessitam de reposição, com investimento estimado de {summary.capitalInPurchases} em {summary.suppliers} fornecedores. A cobertura média é de {summary.averageCoverage} com lead time médio de {summary.averageLeadTime}. O risco geral de abastecimento é classificado como {summary.highestRisk}.
            </p>
          </CardContent>
        </Card>

        <section aria-label="Indicadores de abastecimento">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-3">
            Indicadores
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {([
              { label: "Produtos p/ Reposição", value: String(summary.productsToReplenish), trend: kpiTrend(summary.productsToReplenish, false) },
              { label: "Capital em Compras", value: summary.capitalInPurchases, trend: kpiTrend(summary.capitalInPurchasesValue, false) },
              { label: "Cobertura Média", value: summary.averageCoverage, trend: kpiTrend(summary.averageCoverageDays, true) },
              { label: "Pedidos Pendentes", value: String(summary.pendingOrders), trend: kpiTrend(summary.pendingOrders, true) },
              { label: "Fornecedores", value: String(summary.suppliers), trend: kpiTrend(summary.suppliers > 3 ? 1 : -1, true) },
              { label: "Lead Time Médio", value: summary.averageLeadTime, trend: kpiTrend(-summary.averageLeadTimeDays, true) },
            ]).map((kpi) => {
              const TrendIcon = kpi.trend.icon
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
              )
            })}
          </div>
        </section>

        <section aria-label="Analytics">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-3">
            Analytics
          </h2>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <PurchaseDemandChart data={categories} />
            </div>
            <div>
              <SupplierDistributionChart data={suppliers} />
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

        <section aria-label="Recomendações">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-3">
            Recomendações
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {recommendations.map((rec, i) => (
              <ExecutiveRecommendationCard key={i} recommendation={rec} />
            ))}
          </div>
        </section>

        <footer className="border-t border-border/50 pt-4">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-muted-foreground">
            <span>v0.9.2</span>
            <span>Fonte dos dados: Purchase Intelligence</span>
          </div>
        </footer>
      </div>
    </ContentContainer>
  )
}
