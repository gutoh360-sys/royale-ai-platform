import type { SalesOpportunity } from "@/features/sales-intelligence/types"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const priorityLabel: Record<string, string> = {
  critical: "Crítico",
  high: "Alto",
  medium: "Médio",
  low: "Baixo",
}

const priorityColor: Record<string, string> = {
  critical: "text-destructive",
  high: "text-orange-500",
  medium: "text-warning",
  low: "text-muted-foreground",
}

interface SalesRecommendationListProps {
  opportunities: SalesOpportunity[]
}

export function SalesRecommendationList({ opportunities }: SalesRecommendationListProps) {
  if (opportunities.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma oportunidade encontrada.</p>
  }

  return (
    <div className="space-y-2">
      {opportunities.slice(0, 10).map((opp) => (
        <Card key={opp.id} className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold leading-snug mb-0.5">{opp.productName}</h3>
                <p className="text-xs text-muted-foreground mb-1">{opp.sku} &middot; {opp.category}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{opp.reason}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className={cn("text-xs font-medium", priorityColor[opp.priority])}>
                  {priorityLabel[opp.priority]}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {opp.recommendedAction}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-muted-foreground">
              <span>Receita: R$ {opp.currentRevenue.toLocaleString("pt-BR")}</span>
              <span>Conversão: {(opp.conversionRate * 100).toFixed(1)}%</span>
              <span>Visualizações: {opp.views}</span>
              <span>Estoque: {opp.availableStock}</span>
              <span>Cobertura: {opp.coverageDays !== null ? `${opp.coverageDays}d` : "N/A"}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
