"use client"

import type { ModuleSnapshots } from "@/features/executive-copilot/types/briefing"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Props {
  snapshots: ModuleSnapshots
}

export function ExecutiveAlertsSection({ snapshots }: Props) {
  const { marketplace, financial, inventory, sales, products, purchasing } = snapshots

  const alerts: string[] = []

  if (marketplace.summary.averageHealth < 70) {
    alerts.push(`Saúde média do marketplace em ${marketplace.summary.averageHealth}% — requer atenção.`)
  }

  if (financial.financial && financial.financial.health < 70) {
    alerts.push(`Saúde financeira em ${financial.financial.health}% — abaixo do ideal.`)
  }

  if (inventory.inventory && inventory.inventory.health < 70) {
    alerts.push(`Saúde do estoque em ${inventory.inventory.health}% — risco de desabastecimento.`)
  }

  if (inventory.inventory && inventory.inventory.summary.outOfStockCount > 0) {
    alerts.push(`${inventory.inventory.summary.outOfStockCount} produto(s) com estoque zerado.`)
  }

  if (sales.sales && sales.sales.health < 70) {
    alerts.push(`Saúde das vendas em ${sales.sales.health}% — desempenho abaixo do esperado.`)
  }

  if (products.summary && products.summary.health < 70) {
    alerts.push(`Saúde do portfólio em ${products.summary.health}% — produtos com baixo desempenho.`)
  }

  if (products.summary && products.summary.growth < 0) {
    alerts.push(`Retração de ${Math.abs(products.summary.growth)}% no portfólio de produtos.`)
  }

  if (sales.sales && sales.sales.growth < 0) {
    alerts.push(`Queda de ${Math.abs(sales.sales.growth)}% nas vendas.`)
  }

  if (financial.financial && financial.financial.growth < 0) {
    alerts.push(`Retração financeira de ${Math.abs(financial.financial.growth)}%.`)
  }

  if (purchasing.summary.highestRisk) {
    alerts.push(`Fornecedor ${purchasing.summary.highestRisk} identificado como maior risco — revisar contrato.`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-amber-600">
          Pontos de Atenção
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length > 0 ? (
          <ul className="space-y-2 text-sm text-muted-foreground">
            {alerts.map((a, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                {a}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum ponto de atenção identificado.</p>
        )}
      </CardContent>
    </Card>
  )
}
