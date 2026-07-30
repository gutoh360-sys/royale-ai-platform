"use client"

import type { ModuleSnapshots } from "@/features/executive-copilot/types/briefing"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Props {
  snapshots: ModuleSnapshots
}

export function ExecutiveBriefingSection({ snapshots }: Props) {
  const { marketplace, financial, inventory, sales, products } = snapshots

  const lines: string[] = []

  if (marketplace.marketplaces.length > 0) {
    const active = marketplace.marketplaces.filter((m) => m.status === "connected").length
    lines.push(`Monitorando ${active} marketplace(s) ativo(s) com ${marketplace.summary.totalOrders} pedidos no total.`)
  }

  if (inventory.inventory) {
    const { itemsInStock, stockValue } = inventory.inventory
    lines.push(`Estoque com ${itemsInStock} itens avaliados em R$ ${stockValue.toLocaleString("pt-BR")}.`)
  }

  if (sales.sales) {
    const { revenue } = sales.sales
    lines.push(`Receita total de vendas: R$ ${revenue.toLocaleString("pt-BR")}.`)
  }

  if (financial.financial) {
    const { profit } = financial.financial
    const signal = profit >= 0 ? "positivo" : "negativo"
    lines.push(`Resultado financeiro ${signal} de R$ ${Math.abs(profit).toLocaleString("pt-BR")}.`)
  }

  if (products.summary) {
    const { totalProducts, activeProducts } = products.summary
    lines.push(`${activeProducts} de ${totalProducts} produtos ativos no portfólio.`)
  }

  if (lines.length === 0) {
    lines.push("Nenhum dado disponível para exibir o briefing.")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Situação Geral
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {lines.map((line, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
              {line}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
