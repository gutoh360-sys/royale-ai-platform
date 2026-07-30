import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ExecutiveMetric } from "@/features/dashboard/executive-summary/types";

interface ExecutiveMetricCardProps {
  metric: ExecutiveMetric;
}

const trendConfig = {
  up: { icon: TrendingUp, color: "text-success", bg: "bg-success/10" },
  down: { icon: TrendingDown, color: "text-destructive", bg: "bg-destructive/10" },
  neutral: { icon: Minus, color: "text-muted-foreground", bg: "bg-muted" },
} as const;

export function ExecutiveMetricCard({ metric }: ExecutiveMetricCardProps) {
  const config = trendConfig[metric.trend];
  const TrendIcon = config.icon;
  const MetricIcon = metric.icon;

  return (
    <Card className="flex-1 min-w-0 transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
            {metric.label}
          </span>
          <div
            className={cn(
              "flex size-8 items-center justify-center rounded-lg",
              config.bg,
            )}
            aria-hidden="true"
          >
            <MetricIcon className={cn("size-4", config.color)} aria-hidden="true" />
          </div>
        </div>
        <p className="font-heading text-2xl font-semibold tracking-tight leading-none">
          {metric.formattedValue}
        </p>
        <div className="flex items-center gap-1.5 mt-3">
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-medium",
              config.color,
            )}
            aria-label={`${metric.trend === "up" ? "Aumento" : metric.trend === "down" ? "Queda" : "Estabilidade"} de ${Math.abs(metric.variation)}%`}
          >
            <TrendIcon className="size-3.5" aria-hidden="true" />
            {Math.abs(metric.variation)}%
          </span>
          <span className="text-xs text-muted-foreground">
            {metric.comparisonLabel}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
