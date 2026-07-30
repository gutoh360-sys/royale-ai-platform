import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { AIInsightItemData } from "@/features/dashboard/ai-insights/types";

interface AIInsightItemProps {
  insight: AIInsightItemData;
}

const priorityConfig = {
  high: {
    label: "Alta",
    className: "bg-destructive/10 text-destructive",
  },
  medium: {
    label: "Média",
    className: "bg-warning/10 text-warning",
  },
  low: {
    label: "Baixa",
    className: "bg-info/10 text-info",
  },
} as const;

const categoryLabel: Record<string, string> = {
  sales: "Vendas",
  inventory: "Estoque",
  marketplace: "Marketplace",
  trend: "Tendência",
};

export function AIInsightItem({ insight }: AIInsightItemProps) {
  const priority = priorityConfig[insight.priority];

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs text-muted-foreground">
              {categoryLabel[insight.category]}
            </span>
            <Badge className={cn("text-[10px] px-1.5 py-0 h-auto", priority.className)}>
              {priority.label}
            </Badge>
          </div>
          <h4 className="text-sm font-medium">{insight.title}</h4>
        </div>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {insight.summary}
      </p>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1 text-xs text-muted-foreground"
            title={`Confiança: ${insight.confidence}%`}
          >
            <div className="flex gap-0.5">
              {[1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={cn(
                    "h-1.5 w-3 rounded-full",
                    level <= Math.round(insight.confidence / 25)
                      ? "bg-primary"
                      : "bg-muted",
                  )}
                />
              ))}
            </div>
            <span className="ml-1">{insight.confidence}%</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {new Date(insight.generatedAt).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <Tooltip>
          <TooltipTrigger className="cursor-default">
            <Button variant="outline" size="sm" disabled>
              {insight.actionLabel}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Disponível em uma próxima versão.</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
