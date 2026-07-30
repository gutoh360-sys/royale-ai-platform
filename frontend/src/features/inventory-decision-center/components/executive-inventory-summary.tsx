import { AlertTriangle, AlertCircle, Banknote, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { InventoryIntelligenceSummary } from "@/features/inventory-intelligence/types";

interface ExecutiveInventorySummaryProps {
  summary: InventoryIntelligenceSummary;
}

export function ExecutiveInventorySummary({ summary }: ExecutiveInventorySummaryProps) {
  const buyCount = summary.criticalReplenishmentCount;
  const riskCount = summary.outOfStockCount + summary.stockoutRiskCount + summary.lowStockCount;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="border-destructive/30">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-destructive/10">
              <AlertTriangle className="size-4 text-destructive" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Comprar imediatamente</p>
              <p className="font-heading text-xl font-semibold tracking-tight">{buyCount}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {summary.totalSuggestedPurchaseUnits} unidades · R$ {summary.estimatedSuggestedPurchaseCost.toLocaleString("pt-BR")}
          </p>
        </CardContent>
      </Card>

      <Card className="border-orange-500/30">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-orange-500/10">
              <AlertCircle className="size-4 text-orange-500" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Risco de ruptura</p>
              <p className="font-heading text-xl font-semibold tracking-tight">{riskCount}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Produtos com estoque crítico ou abaixo do mínimo</p>
        </CardContent>
      </Card>

      <Card className="border-warning/30">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-warning/10">
              <Banknote className="size-4 text-warning" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Capital parado</p>
              <p className="font-heading text-xl font-semibold tracking-tight">{summary.idleCapitalProductCount}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            R$ {summary.idleCapitalValue.toLocaleString("pt-BR")} em produtos sem giro ou excesso
          </p>
        </CardContent>
      </Card>

      <Card className="border-success/30">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-success/10">
              <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Estoque saudável</p>
              <p className="font-heading text-xl font-semibold tracking-tight">{summary.healthyCount}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{summary.activeProducts} produtos ativos no total</p>
        </CardContent>
      </Card>
    </div>
  );
}
