import type { SalesSummary } from "@/features/sales-intelligence/types"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, AlertTriangle, DollarSign, BarChart3 } from "lucide-react"

interface SalesOverviewProps {
  summary: SalesSummary
}

export function SalesOverview({ summary }: SalesOverviewProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="size-4 text-muted-foreground" aria-hidden="true" />
            <p className="text-xs text-muted-foreground">Analisados</p>
          </div>
          <p className="font-heading text-xl font-semibold tracking-tight">{summary.productsAnalyzed}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="size-4 text-success" aria-hidden="true" />
            <p className="text-xs text-muted-foreground">Oportunidades</p>
          </div>
          <p className="font-heading text-xl font-semibold tracking-tight">{summary.highOpportunities}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="size-4 text-destructive" aria-hidden="true" />
            <p className="text-xs text-muted-foreground">Críticos</p>
          </div>
          <p className="font-heading text-xl font-semibold tracking-tight text-destructive">
            {summary.criticalProducts}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="size-4 text-muted-foreground" aria-hidden="true" />
            <p className="text-xs text-muted-foreground">Potencial receita</p>
          </div>
          <p className="font-heading text-lg font-semibold tracking-tight">
            R$ {summary.estimatedRevenuePotential.toLocaleString("pt-BR")}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
