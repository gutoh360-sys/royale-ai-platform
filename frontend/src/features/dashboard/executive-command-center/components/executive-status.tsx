import { cn } from "@/lib/utils";
import type { ExecutiveStatusData } from "@/features/dashboard/executive-command-center/types";

interface ExecutiveStatusProps {
  status: ExecutiveStatusData;
}

function getStatusColor(score: number): string {
  if (score >= 90) return "text-success";
  if (score >= 70) return "text-info";
  if (score >= 50) return "text-warning";
  return "text-destructive";
}

function getStatusBg(score: number): string {
  if (score >= 90) return "bg-success";
  if (score >= 70) return "bg-info";
  if (score >= 50) return "bg-warning";
  return "bg-destructive";
}

function getIndicatorBg(score: number): string {
  if (score >= 90) return "bg-success/15";
  if (score >= 70) return "bg-info/15";
  if (score >= 50) return "bg-warning/15";
  return "bg-destructive/15";
}

export function ExecutiveStatus({ status }: ExecutiveStatusProps) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className={cn("flex size-14 items-center justify-center rounded-2xl", getIndicatorBg(status.healthScore))}>
            <span className={cn("font-heading text-2xl font-bold", getStatusColor(status.healthScore))}>
              {status.healthScore}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={cn("size-2 rounded-full", getStatusBg(status.healthScore))} aria-hidden="true" />
              <h2 className="font-heading text-base font-semibold">{status.label}</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed max-w-xl">
              {status.summary}
            </p>
          </div>
        </div>
        <div className="shrink-0">
          <div className="h-2 w-32 rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", getStatusBg(status.healthScore))}
              style={{ width: `${status.healthScore}%` }}
              role="progressbar"
              aria-valuenow={status.healthScore}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Health Score: ${status.healthScore}/100`}
            />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground text-right">Health Score</p>
        </div>
      </div>
    </div>
  );
}
