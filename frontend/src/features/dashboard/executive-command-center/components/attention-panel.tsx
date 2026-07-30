import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AttentionItem } from "@/features/dashboard/executive-command-center/types";

interface AttentionPanelProps {
  items: AttentionItem[];
}

const priorityConfig = {
  critical: { icon: AlertTriangle, label: "Crítico", class: "text-destructive bg-destructive/10 border-destructive/20" },
  high: { icon: AlertTriangle, label: "Alto", class: "text-orange-500 bg-orange-500/10 border-orange-500/20" },
  medium: { icon: AlertCircle, label: "Médio", class: "text-warning bg-warning/10 border-warning/20" },
  low: { icon: Info, label: "Baixo", class: "text-info bg-info/10 border-info/20" },
};

const categoryLabel: Record<string, string> = {
  inventory: "Estoque",
  marketplace: "Marketplace",
  financial: "Financeiro",
  integration: "Integração",
  sales: "Vendas",
  system: "Sistema",
};

export function AttentionPanel({ items }: AttentionPanelProps) {
  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="size-4 text-warning" aria-hidden="true" />
          Requer Atenção
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2" role="list" aria-label="Itens que requerem atenção">
          {items.map((item) => {
            const config = priorityConfig[item.priority];
            const Icon = config.icon;
            return (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-lg border p-3"
                role="listitem"
              >
                <Icon className={cn("mt-0.5 size-4 shrink-0", config.class.split(" ")[0])} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-relaxed">{item.description}</p>
                </div>
                <Badge
                  variant="outline"
                  className={cn("text-[10px] px-1.5 py-0 h-auto", config.class)}
                >
                  {categoryLabel[item.category]}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
