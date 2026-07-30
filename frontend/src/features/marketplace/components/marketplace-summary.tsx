import { TrendingUp, ArrowUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getHealthConfig } from "@/features/marketplace/utils/health";
import type { MarketplaceSummaryData } from "@/features/marketplace/types";

interface MarketplaceSummaryProps {
  summary: MarketplaceSummaryData;
}

export function MarketplaceSummary({ summary }: MarketplaceSummaryProps) {
  const health = getHealthConfig(summary.averageHealth);

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="size-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="font-heading text-sm font-semibold">Resumo Consolidado</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <p className="text-[11px] text-muted-foreground">Receita Total</p>
            <p className="text-lg font-semibold font-heading tracking-tight">{summary.totalRevenue}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Pedidos</p>
            <p className="text-lg font-semibold font-heading tracking-tight">{summary.formattedTotalOrders}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Ticket Médio</p>
            <p className="text-lg font-semibold font-heading tracking-tight">{summary.averageTicket}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Líder</p>
            <p className="text-sm font-semibold">{summary.leaderName}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Maior Crescimento</p>
            <p className="text-sm font-semibold flex items-center gap-1">
              <ArrowUp className="size-3 text-success" />
              {summary.highestGrowthName}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Saúde Média</p>
            <p className={cn("text-sm font-semibold", health.color)}>{health.label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
