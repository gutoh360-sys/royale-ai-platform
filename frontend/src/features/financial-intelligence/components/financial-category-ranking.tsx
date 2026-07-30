import type { FinancialInsight } from "@/features/financial-intelligence/types"
import { Card, CardContent } from "@/components/ui/card"

interface FinancialCategoryRankingProps {
  insights: FinancialInsight[]
}

export function FinancialCategoryRanking({ insights }: FinancialCategoryRankingProps) {
  const categories = new Map<string, { revenue: number; profit: number; count: number }>()
  for (const i of insights) {
    const cat = categories.get(i.category) ?? { revenue: 0, profit: 0, count: 0 }
    cat.revenue += i.currentRevenue
    cat.profit += i.estimatedProfit
    cat.count++
    categories.set(i.category, cat)
  }

  const sorted = [...categories.entries()].sort((a, b) => b[1].revenue - a[1].revenue)

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Ranking por categoria
        </p>
        <div className="space-y-3">
          {sorted.map(([category, data]) => (
            <div key={category} className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{category}</p>
                <p className="text-[11px] text-muted-foreground">{data.count} produtos</p>
              </div>
              <div className="text-right shrink-0 ml-4">
                <p className="text-sm font-semibold">R$ {data.revenue.toLocaleString("pt-BR")}</p>
                <p className="text-[11px] text-muted-foreground">Lucro: R$ {data.profit.toLocaleString("pt-BR")}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
