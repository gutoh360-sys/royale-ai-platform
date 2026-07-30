import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SalesPeriodComparison } from "../types"

interface SalesComparisonPanelProps {
  comparison: SalesPeriodComparison
}

export function SalesComparisonPanel({ comparison }: SalesComparisonPanelProps) {
  const items = [
    { key: "revenue" as const, label: "Receita", current: comparison.revenue.current, previous: comparison.revenue.previous, change: comparison.revenue.change, format: (v: number) => `R$ ${(v / 1000).toFixed(1)}k` },
    { key: "orders" as const, label: "Pedidos", current: comparison.orders.current, previous: comparison.orders.previous, change: comparison.orders.change, format: (v: number) => v.toLocaleString("pt-BR") },
    { key: "averageTicket" as const, label: "Ticket médio", current: comparison.averageTicket.current, previous: comparison.averageTicket.previous, change: comparison.averageTicket.change, format: (v: number) => `R$ ${v.toFixed(2)}` },
    { key: "conversionRate" as const, label: "Conversão", current: comparison.conversionRate.current, previous: comparison.conversionRate.previous, change: comparison.conversionRate.change, format: (v: number) => `${(v * 100).toFixed(2)}%` },
  ]

  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Comparação com período anterior</p>
      <div className="text-[11px] text-muted-foreground mb-3">Variação percentual vs período anterior</div>
      <div className="space-y-2">
        {items.map((item) => {
          const isPositive = item.change > 0
          const isNegative = item.change < 0
          const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus
          return (
            <div key={item.key} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
              <div>
                <p className="text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.format(item.current)}</p>
              </div>
              <div className={cn("flex items-center gap-1 text-sm font-medium", isPositive ? "text-success" : isNegative ? "text-destructive" : "text-muted-foreground")}>
                <TrendIcon className="size-3.5" aria-hidden="true" />
                <span>{isPositive ? "+" : ""}{item.change.toFixed(1)}%</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
