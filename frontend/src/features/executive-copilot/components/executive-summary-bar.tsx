"use client"

import type { ModuleSnapshots } from "@/features/executive-copilot/types/briefing"
import { Card } from "@/components/ui/card"

interface Props {
  snapshots: ModuleSnapshots
}

export function ExecutiveSummaryBar({ snapshots }: Props) {
  const { marketplace, financial, inventory, sales, products, priorities } = snapshots

  const parts: string[] = []

  const healths = [
    { name: "Marketplace", value: marketplace.summary.averageHealth },
    { name: "Finanças", value: financial.financial?.health ?? null },
    { name: "Estoque", value: inventory.inventory?.health ?? null },
    { name: "Vendas", value: sales.sales?.health ?? null },
    { name: "Produtos", value: products.summary?.health ?? null },
  ]

  const good = healths.filter((h) => h.value !== null && h.value >= 70).length
  const bad = healths.filter((h) => h.value !== null && h.value < 70).length

  if (good > 0) {
    parts.push(`${good} área(s) saudável(is)`)
  }

  if (bad > 0) {
    parts.push(`${bad} área(s) com atenção`)
  }

  if (priorities.length > 0) {
    parts.push(`${priorities.length} prioridade(s)`)
  }

  const label = parts.length > 0 ? parts.join(" · ") : "Nenhum dado disponível"

  return (
    <Card className="border-l-4 border-l-primary py-3">
      <p className="px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Resumo Executivo
      </p>
      <p className="mt-1 px-4 text-sm">{label}</p>
    </Card>
  )
}
