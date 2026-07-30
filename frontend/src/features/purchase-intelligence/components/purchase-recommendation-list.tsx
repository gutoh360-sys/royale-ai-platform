import type { PurchaseRecommendation } from "@/features/purchase-intelligence/types"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const urgencyLabel: Record<string, string> = {
  immediate: "Imediata",
  today: "Hoje",
  this_week: "Esta semana",
  planned: "Programado",
}

const urgencyColor: Record<string, string> = {
  immediate: "text-destructive",
  today: "text-orange-500",
  this_week: "text-warning",
  planned: "text-muted-foreground",
}

interface PurchaseRecommendationListProps {
  recommendations: PurchaseRecommendation[]
}

export function PurchaseRecommendationList({ recommendations }: PurchaseRecommendationListProps) {
  if (recommendations.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma recomendação de compra no momento.</p>
  }

  return (
    <div className="space-y-2">
      {recommendations.slice(0, 10).map((rec) => (
        <Card key={rec.id} className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold leading-snug mb-0.5">{rec.productName}</h3>
                <p className="text-xs text-muted-foreground mb-2">{rec.sku}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{rec.reason}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className={cn("text-xs font-medium", urgencyColor[rec.urgency])}>
                  {urgencyLabel[rec.urgency]}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {rec.recommendedQuantity} un.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-muted-foreground">
              <span>Estoque: {rec.currentStock}</span>
              <span>Cobertura: {rec.coverageDays ?? "?"}d</span>
              <span>Lead time: {rec.leadTimeDays}d</span>
              <span>Investimento: R$ {rec.estimatedInvestment.toLocaleString("pt-BR")}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
