import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ExecutiveRecommendationData } from "@/features/dashboard/executive-command-center/types";

interface ExecutiveRecommendationProps {
  recommendation: ExecutiveRecommendationData;
}

const priorityConfig = {
  critical: { label: "Crítica", className: "bg-destructive/10 text-destructive" },
  high: { label: "Alta", className: "bg-destructive/10 text-destructive" },
  medium: { label: "Média", className: "bg-warning/10 text-warning" },
  low: { label: "Baixa", className: "bg-info/10 text-info" },
};

export function ExecutiveRecommendation({ recommendation }: ExecutiveRecommendationProps) {
  const priority = priorityConfig[recommendation.priority];

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h4 className="text-sm font-semibold leading-snug">{recommendation.action}</h4>
        <Badge className={cn("text-[10px] px-1.5 py-0 h-auto", priority.className)}>
          {priority.label}
        </Badge>
      </div>
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <span className="text-xs font-medium text-muted-foreground shrink-0 w-12">Motivo:</span>
          <p className="text-sm text-muted-foreground leading-relaxed">{recommendation.reason}</p>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-xs font-medium text-muted-foreground shrink-0 w-12">Impacto:</span>
          <p className="text-sm text-muted-foreground leading-relaxed">{recommendation.impact}</p>
        </div>
      </div>
    </div>
  );
}
