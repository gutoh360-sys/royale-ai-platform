import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { InventoryAnalysis } from "@/features/inventory-intelligence/types";
import type { FilterMode } from "@/features/inventory-decision-center/types";

interface CriticalProductsListProps {
  products: InventoryAnalysis[];
  filter: FilterMode;
  onFilterChange: (f: FilterMode) => void;
}

const filters: { value: FilterMode; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "critical", label: "Críticos" },
  { value: "risk", label: "Risco" },
  { value: "slow", label: "Parados" },
  { value: "healthy", label: "Saudáveis" },
];

const priorityConfig = {
  critical: { label: "CRÍTICA", className: "bg-destructive/10 text-destructive border-destructive/30" },
  high: { label: "ALTA", className: "bg-orange-500/10 text-orange-500 border-orange-500/30" },
  medium: { label: "MÉDIA", className: "bg-warning/10 text-warning border-warning/30" },
  low: { label: "BAIXA", className: "bg-info/10 text-info border-info/30" },
  none: { label: "—", className: "bg-muted text-muted-foreground border-muted" },
};

export function CriticalProductsList({ products, filter, onFilterChange }: CriticalProductsListProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Top Prioridades</CardTitle>
          <div className="flex items-center gap-1 rounded-lg border p-0.5">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => onFilterChange(f.value)}
                className={cn(
                  "rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
                  filter === f.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhum produto encontrado para o filtro selecionado.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {products.map((p) => {
              const config = priorityConfig[p.replenishmentPriority] ?? priorityConfig.none;
              return (
                <div key={p.productId} className="rounded-lg border p-4 text-sm">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-medium">{p.productName}</p>
                      <p className="text-xs text-muted-foreground">SKU {p.sku}</p>
                    </div>
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-auto font-semibold", config.className)}>
                      {config.label}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Estoque</p>
                      <p className="text-sm font-medium">{p.availableStock}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Cobertura</p>
                      <p className="text-sm font-medium">{p.stockCoverageDays !== null ? `${p.stockCoverageDays} dias` : "—"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Comprar</p>
                      <p className="text-sm font-medium">{p.suggestedPurchaseQuantity}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Curva</p>
                      <p className="text-sm font-medium">{p.abcClass}</p>
                    </div>
                  </div>
                  {p.reasons.length > 0 && (
                    <ul className="flex flex-wrap gap-x-4 gap-y-0.5">
                      {p.reasons.map((r, i) => (
                        <li key={i} className="text-xs text-muted-foreground">• {r}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
