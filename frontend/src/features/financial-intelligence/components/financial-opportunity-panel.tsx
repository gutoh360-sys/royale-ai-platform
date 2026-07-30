import type { FinancialSummary } from "@/features/financial-intelligence/types"
import { Card, CardContent } from "@/components/ui/card"

interface FinancialOpportunityPanelProps {
  summary: FinancialSummary
}

export function FinancialOpportunityPanel({ summary }: FinancialOpportunityPanelProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Panorama financeiro
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] text-muted-foreground">Lucro bruto estimado</p>
            <p className="font-heading text-lg font-semibold tracking-tight">
              R$ {summary.estimatedGrossProfit.toLocaleString("pt-BR")}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Capital parado</p>
            <p className="font-heading text-lg font-semibold tracking-tight text-destructive">
              R$ {summary.idleCapital.toLocaleString("pt-BR")}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">ROI médio</p>
            <p className="font-heading text-lg font-semibold tracking-tight">{summary.averageROI}%</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Payback médio</p>
            <p className="font-heading text-lg font-semibold tracking-tight">{summary.averagePayback} dias</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
