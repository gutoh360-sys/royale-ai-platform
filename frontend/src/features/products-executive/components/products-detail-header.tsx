"use client"

import { cn } from "@/lib/utils"
import type { PortfolioSummary } from "@/features/products-executive/types"

interface ProductsDetailHeaderProps {
  summary: PortfolioSummary
}

function getHealthConfig(health: number) {
  if (health >= 80) return { label: "Boa", color: "text-success" }
  if (health >= 60) return { label: "Atenção", color: "text-warning" }
  return { label: "Crítica", color: "text-destructive" }
}

function getDiversificationConfig(value: number) {
  if (value <= 40) return { label: "Diversificado", color: "text-success" }
  if (value <= 60) return { label: "Moderado", color: "text-warning" }
  return { label: "Concentrado", color: "text-destructive" }
}

export function ProductsDetailHeader({ summary }: ProductsDetailHeaderProps) {
  const health = getHealthConfig(summary.health)
  const diversification = getDiversificationConfig(summary.top10ConcentrationValue)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
            P
          </div>
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Portfólio de Produtos
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.activeProducts} produtos ativos em {summary.categories} categorias
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">Saúde do Portfólio</p>
            <p className={cn("text-sm font-semibold", health.color)}>{health.label}</p>
          </div>
          <div className="h-8 w-px bg-border" aria-hidden="true" />
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">Performance</p>
            <p className={cn("text-sm font-semibold", summary.growth >= 0 ? "text-success" : "text-destructive")}>
              {summary.growth >= 0 ? "+" : ""}{summary.growth}%
            </p>
          </div>
          <div className="h-8 w-px bg-border" aria-hidden="true" />
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">Crescimento</p>
            <p className={cn("text-sm font-semibold", summary.growth >= 5 ? "text-success" : "text-muted-foreground")}>
              {summary.totalRevenue}
            </p>
          </div>
          <div className="h-8 w-px bg-border" aria-hidden="true" />
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">Diversificação</p>
            <p className={cn("text-sm font-semibold", diversification.color)}>{diversification.label}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
