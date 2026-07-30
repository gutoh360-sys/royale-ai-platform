import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { AIRecommendationData } from "@/features/dashboard/ai-recommendations/types";

interface AIRecommendationItemProps {
  recommendation: AIRecommendationData;
}

const priorityConfig = {
  high: { label: "Alta", className: "bg-destructive/10 text-destructive" },
  medium: { label: "Média", className: "bg-warning/10 text-warning" },
  low: { label: "Baixa", className: "bg-info/10 text-info" },
} as const;

const categoryLabel: Record<string, string> = {
  sales: "Vendas",
  inventory: "Estoque",
  marketplace: "Marketplace",
  trend: "Tendência",
};

export function AIRecommendationItem({
  recommendation,
}: AIRecommendationItemProps) {
  const priority = priorityConfig[recommendation.priority];

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {categoryLabel[recommendation.category]}
            </span>
            <Badge
              className={cn(
                "text-[10px] px-1.5 py-0 h-auto",
                priority.className,
              )}
            >
              {priority.label}
            </Badge>
          </div>
          <h4 className="text-sm font-medium leading-snug">{recommendation.title}</h4>
        </div>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {recommendation.summary}
      </p>
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-3">
          <span
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
            title={`Confiança: ${recommendation.confidence}%`}
          >
            <span className="flex gap-0.5">
              {[1, 2, 3, 4].map((level) => (
                <span
                  key={level}
                  className={cn(
                    "h-1.5 w-3 rounded-full",
                    level <= Math.round(recommendation.confidence / 25)
                      ? "bg-primary"
                      : "bg-muted",
                  )}
                />
              ))}
            </span>
            {recommendation.confidence}%
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(recommendation.generatedAt).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <Tooltip>
          <TooltipTrigger className="cursor-default">
            <Button variant="outline" size="sm" disabled>
              {recommendation.actionLabel}
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
