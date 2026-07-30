import { ShoppingCart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { InventoryIntelligenceSummary } from "@/features/inventory-intelligence/types";

interface PurchaseSummaryProps {
  summary: InventoryIntelligenceSummary;
}

export function PurchaseSummary({ summary }: PurchaseSummaryProps) {
  const productsToBuy = summary.topReplenishmentProducts.filter(
    (p) => p.suggestedPurchaseQuantity > 0,
  ).length;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
            <ShoppingCart className="size-4 text-primary" aria-hidden="true" />
          </div>
          <div>
            <p className="font-heading text-sm font-semibold">Resumo da Compra</p>
            <p className="text-xs text-muted-foreground">Baseado nas prioridades calculadas</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-[11px] text-muted-foreground">Produtos para comprar</p>
            <p className="font-heading text-xl font-semibold tracking-tight">{productsToBuy}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Unidades</p>
            <p className="font-heading text-xl font-semibold tracking-tight">{summary.totalSuggestedPurchaseUnits}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Investimento estimado</p>
            <p className="font-heading text-xl font-semibold tracking-tight">
              R$ {summary.estimatedSuggestedPurchaseCost.toLocaleString("pt-BR")}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
