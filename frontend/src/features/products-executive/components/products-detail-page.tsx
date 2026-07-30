"use client"

import { useMemo } from "react"
import { AlertCircle, TrendingUp, TrendingDown, Minus, Lightbulb } from "lucide-react"
import { cn } from "@/lib/utils"
import { ContentContainer } from "@/components/shell/content-container"
import { Card, CardContent } from "@/components/ui/card"
import { ProductsDetailHeader } from "./products-detail-header"
import { ProductsDetailSkeleton } from "./products-detail-skeleton"
import { PortfolioDistributionChart } from "./portfolio-distribution-chart"
import { CategoryPerformanceChart } from "./category-performance-chart"
import { useProductsData } from "@/features/products-executive/hooks/use-products-data"
import { buildProductsInsights, buildProductsRecommendations } from "@/features/products-executive/utils/products-insights"
import { ExecutiveInsightCard } from "@/features/executive-domain/components/executive-insight-card"
import { ExecutiveRecommendationCard } from "@/features/executive-domain/components/executive-recommendation-card"

function kpiTrend(value: number, positive: boolean): { icon: typeof TrendingUp; label: string; color: string } {
  const isGood = positive ? value > 0 : value < 0
  if (isGood) return { icon: TrendingUp, label: "Positivo", color: "text-success" }
  if (value === 0) return { icon: Minus, label: "Estável", color: "text-muted-foreground" }
  return { icon: TrendingDown, label: "Negativo", color: "text-destructive" }
}

export function ProductsDetailPage() {
  const { products, categories, summary, status } = useProductsData()

  const insightInput = useMemo(() => {
    if (products.length === 0) return null
    return {
      products: products.map((p) => ({
        name: p.name,
        revenue: p.revenue,
        formattedRevenue: p.formattedRevenue,
        margin: p.margin,
        formattedMargin: p.formattedMargin,
        growth: p.growth,
        share: p.share,
        formattedShare: p.formattedShare,
      })),
      categories: categories.map((c) => ({
        name: c.name,
        formattedRevenue: c.formattedRevenue,
        growth: c.growth,
      })),
      totalRevenue: summary.totalRevenue,
      topSkuName: summary.topSkuName,
      topSkuRevenue: summary.topSkuRevenue,
    }
  }, [products, categories, summary])

  const insights = useMemo(() => {
    if (!insightInput) return []
    return buildProductsInsights(insightInput)
  }, [insightInput])

  const recommendations = useMemo(() => {
    if (!insightInput) return []
    return buildProductsRecommendations(insightInput)
  }, [insightInput])

  if (status === "loading") {
    return (
      <ContentContainer>
        <ProductsDetailSkeleton />
      </ContentContainer>
    )
  }

  if (status === "error") {
    return (
      <ContentContainer>
        <div className="flex items-center justify-center gap-2 min-h-[400px]">
          <AlertCircle className="size-5 text-destructive" />
          <p className="text-sm text-muted-foreground">Erro ao carregar dados de produtos</p>
        </div>
      </ContentContainer>
    )
  }

  if (products.length === 0) {
    return (
      <ContentContainer>
        <div className="flex items-center justify-center gap-2 min-h-[400px]">
          <AlertCircle className="size-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum produto encontrado</p>
        </div>
      </ContentContainer>
    )
  }

  const sortedByRevenue = [...products].sort((a, b) => b.revenue - a.revenue)
  const top10Concentration = sortedByRevenue.slice(0, 10).reduce((s, p) => s + p.share, 0)

  return (
    <ContentContainer>
      <div className="animate-in fade-in duration-300 space-y-8">
        <ProductsDetailHeader summary={summary} />

        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {summary.totalRevenue} em receita total com {summary.activeProducts} produtos ativos distribuídos em {summary.categories} categorias. O destaque é {summary.topSkuName} com {summary.topSkuRevenue}. A margem média do portfólio é de {summary.averageMargin}, com concentração de {summary.top10Concentration} nos 10 principais produtos.
            </p>
          </CardContent>
        </Card>

        <section aria-label="Indicadores do portfólio">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-3">
            Indicadores
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {([
              { label: "Produtos Ativos", value: String(summary.activeProducts), trend: kpiTrend(summary.activeProducts > 0 ? 1 : 0, true) },
              { label: "Categorias", value: String(summary.categories), trend: kpiTrend(summary.categories > 3 ? 1 : 0, true) },
              { label: "Top SKU", value: summary.topSkuName.length > 18 ? summary.topSkuName.slice(0, 16) + "..." : summary.topSkuName, trend: kpiTrend(1, true) },
              { label: "Receita por Produto", value: summary.averageRevenuePerProduct, trend: kpiTrend(summary.averageMarginValue > 0 ? 1 : 0, true) },
              { label: "Margem Média", value: summary.averageMargin, trend: kpiTrend(summary.averageMarginValue >= 35 ? 1 : -1, true) },
              { label: "Conc. Top 10", value: summary.top10Concentration, trend: kpiTrend(top10Concentration > 50 ? -1 : 1, false) },
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
              <PortfolioDistributionChart
                data={products.map((p) => ({ name: p.name, revenue: p.revenue, margin: p.margin, growth: p.growth }))}
              />
            </div>
            <div>
              <CategoryPerformanceChart
                data={categories.map((c) => ({ name: c.name, revenue: c.revenue, growth: c.growth }))}
              />
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
            <span>v0.9.1</span>
            <span>Fonte dos dados: Products Intelligence</span>
          </div>
        </footer>
      </div>
    </ContentContainer>
  )
}
