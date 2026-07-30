"use client"

import { ArrowLeft, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useSalesExecutive } from "./use-sales-executive"
import {
  SalesDetailHeader,
  SalesDetailSkeleton,
  RevenueTrendChart,
  OrderTrendChart,
  SalesInsightsPanel,
  SalesRecommendationsPanel,
  SalesComparisonPanel,
} from "./components"

export function SalesDetailPage() {
  const { data, loading } = useSalesExecutive()

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-16 rounded bg-muted animate-pulse" />
        <SalesDetailSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Voltar ao painel
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Vendas</h1>
          <p className="text-sm text-muted-foreground">Métricas e análises comerciais</p>
        </div>
        <Link
          href="/sales/decisions"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-1"
        >
          Centro de Decisões
          <ArrowRight className="size-3" aria-hidden="true" />
        </Link>
      </div>

      <SalesDetailHeader data={data.data} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RevenueTrendChart data={data.charts.revenueTrend} />
        <OrderTrendChart data={data.charts.orderTrend} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SalesInsightsPanel insights={data.insights} />
        <div className="space-y-4">
          <SalesComparisonPanel comparison={data.comparison} />
          <SalesRecommendationsPanel recommendations={data.recommendations} />
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground text-right">
        Última atualização: {new Date(data.lastUpdated).toLocaleString("pt-BR")}
      </p>
    </div>
  )
}
