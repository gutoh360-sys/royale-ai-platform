"use client";

import { Loader2, AlertCircle, FileText } from "lucide-react";
import { ExecutiveMetricCard } from "./executive-metric-card";
import type { ExecutiveMetric, DashboardState } from "@/features/dashboard/executive-summary/types";

interface ExecutiveSummaryProps {
  metrics?: ExecutiveMetric[];
  state?: DashboardState;
}

export function ExecutiveSummary({
  metrics = [],
  state = "success",
}: ExecutiveSummaryProps) {
  if (state === "loading") {
    return (
      <div className="flex items-center justify-center rounded-xl border bg-card p-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border bg-card p-12">
        <AlertCircle className="size-5 text-destructive" />
        <p className="text-sm text-muted-foreground">
          Erro ao carregar métricas
        </p>
      </div>
    );
  }

  if (state === "empty" || metrics.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border bg-card p-12">
        <FileText className="size-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Nenhuma métrica disponível para o período
        </p>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      role="region"
      aria-label="Métricas executivas"
    >
      {metrics.map((metric) => (
        <ExecutiveMetricCard key={metric.id} metric={metric} />
      ))}
    </div>
  );
}
