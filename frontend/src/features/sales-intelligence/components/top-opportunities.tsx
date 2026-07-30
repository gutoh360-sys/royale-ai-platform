import type { SalesSummary } from "@/features/sales-intelligence/types"
import { Card, CardContent } from "@/components/ui/card"

interface TopOpportunitiesProps {
  summary: SalesSummary
}

export function TopOpportunities({ summary }: TopOpportunitiesProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Potencial financeiro
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] text-muted-foreground">Receita potencial</p>
            <p className="font-heading text-lg font-semibold tracking-tight">
              R$ {summary.estimatedRevenuePotential.toLocaleString("pt-BR")}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Margem potencial</p>
            <p className="font-heading text-lg font-semibold tracking-tight">
              R$ {summary.estimatedMarginPotential.toLocaleString("pt-BR")}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Conversão média</p>
            <p className="font-heading text-lg font-semibold tracking-tight">
              {(summary.averageConversion * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Cobertura média</p>
            <p className="font-heading text-lg font-semibold tracking-tight">
              {summary.averageStockCoverage !== null ? `${summary.averageStockCoverage}d` : "N/A"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
