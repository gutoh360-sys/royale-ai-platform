import type { PurchaseSummary } from "@/features/purchase-intelligence/types"
import { Card, CardContent } from "@/components/ui/card"

interface InvestmentSummaryProps {
  summary: PurchaseSummary
}

export function InvestmentSummary({ summary }: InvestmentSummaryProps) {
  const roi = summary.recommendedInvestment > 0
    ? Math.round((summary.estimatedProtectedMargin / summary.recommendedInvestment) * 100)
    : 0

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Impacto financeiro
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] text-muted-foreground">Investimento</p>
            <p className="font-heading text-lg font-semibold tracking-tight">
              R$ {summary.recommendedInvestment.toLocaleString("pt-BR")}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Receita protegida</p>
            <p className="font-heading text-lg font-semibold tracking-tight">
              R$ {summary.estimatedProtectedRevenue.toLocaleString("pt-BR")}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Margem protegida</p>
            <p className="font-heading text-lg font-semibold tracking-tight">
              R$ {summary.estimatedProtectedMargin.toLocaleString("pt-BR")}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">ROI estimado</p>
            <p className="font-heading text-lg font-semibold tracking-tight">
              {roi}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
