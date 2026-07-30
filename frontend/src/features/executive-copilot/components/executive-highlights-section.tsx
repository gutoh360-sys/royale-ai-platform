"use client"

import type { ModuleSnapshots } from "@/features/executive-copilot/types/briefing"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Props {
  snapshots: ModuleSnapshots
}

export function ExecutiveHighlightsSection({ snapshots }: Props) {
  const { marketplace, financial, inventory, sales, products, purchasing } = snapshots

  const highlights: string[] = []

  if (marketplace.summary.averageHealth >= 70) {
    highlights.push(`Marketplace com saúde média ${marketplace.summary.averageHealth}% — desempenho positivo.`)
  }

  if (financial.financial && financial.financial.health >= 70) {
    highlights.push(`Saúde financeira em ${financial.financial.health}% — cenário favorável.`)
  }

  if (inventory.inventory && inventory.inventory.health >= 70) {
    highlights.push(`Estoque saudável (${inventory.inventory.health}%) com ${inventory.inventory.itemsInStock} itens.`)
  }

  if (sales.sales && sales.sales.health >= 70) {
    highlights.push(`Vendas com saúde ${sales.sales.health}% — bom desempenho comercial.`)
  }

  if (products.summary && products.summary.health >= 70) {
    highlights.push(`Portfólio de produtos saudável (${products.summary.health}%).`)
  }

  if (purchasing.summary.health >= 70) {
    highlights.push(`Fornecedores com saúde ${purchasing.summary.health}% — boa relação comercial.`)
  }

  if (products.summary && products.summary.growth > 0) {
    highlights.push(`Crescimento de ${products.summary.growth}% no portfólio de produtos.`)
  }

  if (sales.sales && sales.sales.growth > 0) {
    highlights.push(`Crescimento de ${sales.sales.growth}% nas vendas.`)
  }

  if (marketplace.summary.highestGrowth > 0) {
    highlights.push(`Maior crescimento entre marketplaces: ${marketplace.summary.highestGrowth}%.`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-emerald-600">
          Principais Destaques
        </CardTitle>
      </CardHeader>
      <CardContent>
        {highlights.length > 0 ? (
          <ul className="space-y-2 text-sm text-muted-foreground">
            {highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
                {h}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum destaque identificado no momento.</p>
        )}
      </CardContent>
    </Card>
  )
}
