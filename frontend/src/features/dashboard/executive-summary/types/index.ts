import type { LucideIcon } from "lucide-react";

export type MetricTrend = "up" | "down" | "neutral";

export interface ExecutiveMetric {
  id: string;
  label: string;
  value: number;
  formattedValue: string;
  variation: number;
  trend: MetricTrend;
  comparisonLabel: string;
  icon: LucideIcon;
}

export type DashboardState = "loading" | "success" | "empty" | "error";
