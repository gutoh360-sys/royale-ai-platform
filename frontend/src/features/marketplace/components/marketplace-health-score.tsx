"use client";

import { cn } from "@/lib/utils";
import { getHealthConfig } from "@/features/marketplace/utils/health";

interface MarketplaceHealthScoreProps {
  score: number;
}

export function MarketplaceHealthScore({ score }: MarketplaceHealthScoreProps) {
  const health = getHealthConfig(score);

  return (
    <div className="flex items-center gap-5 rounded-xl border bg-card p-5">
      <div className={cn("flex size-16 items-center justify-center rounded-2xl", health.barColor.replace("bg-", "bg-") + "/15")}>
        <span className={cn("font-heading text-3xl font-bold", health.color)}>
          {score}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn("size-2 rounded-full", health.barColor)} aria-hidden="true" />
          <span className={cn("text-sm font-semibold", health.color)}>{health.label}</span>
        </div>
        <p className="text-xs text-muted-foreground">Health Score</p>
        <div className="mt-2 h-1.5 w-full max-w-40 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", health.barColor)}
            style={{ width: `${score}%` }}
            role="progressbar"
            aria-valuenow={score}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Health Score: ${score}/100`}
          />
        </div>
      </div>
    </div>
  );
}
