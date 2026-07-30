import type { PurchaseSummary } from "@/features/purchase-intelligence/types"
import { Card, CardContent } from "@/components/ui/card"
import { ShoppingCart, AlertTriangle, DollarSign, TrendingUp } from "lucide-react"

interface PurchaseOverviewProps {
  summary: PurchaseSummary
}

export function PurchaseOverview({ summary }: PurchaseOverviewProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart className="size-4 text-muted-foreground" aria-hidden="true" />
            <p className="text-xs text-muted-foreground">Produtos</p>
          </div>
          <p className="font-heading text-xl font-semibold tracking-tight">{summary.totalProducts}</p>
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
            <p className="text-xs text-muted-foreground">Investimento</p>
          </div>
          <p className="font-heading text-lg font-semibold tracking-tight">
            R$ {summary.recommendedInvestment.toLocaleString("pt-BR")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="size-4 text-success" aria-hidden="true" />
            <p className="text-xs text-muted-foreground">Margem protegida</p>
          </div>
          <p className="font-heading text-lg font-semibold tracking-tight">
            R$ {summary.estimatedProtectedMargin.toLocaleString("pt-BR")}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
