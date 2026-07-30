"use client"

import { cn } from "@/lib/utils"
import type { PurchasingSummary } from "@/features/purchasing-executive/types"

interface PurchasingDetailHeaderProps {
  summary: PurchasingSummary
}

function getHealthConfig(health: number) {
  if (health >= 80) return { label: "Boa", color: "text-success" }
  if (health >= 50) return { label: "Atenção", color: "text-warning" }
  return { label: "Crítica", color: "text-destructive" }
}

function getCoverageLabel(days: number) {
  if (days >= 15) return { label: "Confortável", color: "text-success" }
  if (days >= 8) return { label: "Moderada", color: "text-warning" }
  return { label: "Crítica", color: "text-destructive" }
}

function getPriorityConfig(priority: string) {
  if (priority === "Alta") return { label: "Alta", color: "text-destructive" }
  if (priority === "Média") return { label: "Média", color: "text-warning" }
  return { label: "Baixa", color: "text-muted-foreground" }
}

export function PurchasingDetailHeader({ summary }: PurchasingDetailHeaderProps) {
  const health = getHealthConfig(summary.health)
  const coverage = getCoverageLabel(summary.averageCoverageDays)
  const priority = getPriorityConfig(summary.generalPriority)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
            C
          </div>
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Abastecimento
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.productsToReplenish} produtos para reposição · {summary.suppliers} fornecedores ativos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">Saúde de Abastecimento</p>
            <p className={cn("text-sm font-semibold", health.color)}>{health.label}</p>
          </div>
          <div className="h-8 w-px bg-border" aria-hidden="true" />
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">Status</p>
            <p className={cn("text-sm font-semibold", health.color)}>{summary.health}/100</p>
          </div>
          <div className="h-8 w-px bg-border" aria-hidden="true" />
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">Cobertura</p>
            <p className={cn("text-sm font-semibold", coverage.color)}>{coverage.label}</p>
          </div>
          <div className="h-8 w-px bg-border" aria-hidden="true" />
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">Prioridade Geral</p>
            <p className={cn("text-sm font-semibold", priority.color)}>{priority.label}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
