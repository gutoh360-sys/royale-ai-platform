export type { ExecutiveMetric, MetricTrend, DashboardState } from "@/features/dashboard/executive-summary/types";
export type { AIRecommendationData, AIRecommendationsState, InsightPriority, InsightCategory } from "@/features/dashboard/ai-recommendations/types";
export type { AlertData, AlertSeverity, AlertCategory, AlertStatus, AlertsState } from "@/features/dashboard/alerts-center/types";

export interface DashboardData {
  metrics: import("@/features/dashboard/executive-summary/types").ExecutiveMetric[];
  recommendations: import("@/features/dashboard/ai-recommendations/types").AIRecommendationData[];
  alerts: import("@/features/dashboard/alerts-center/types").AlertData[];
}

export type DashboardDataStatus = "idle" | "loading" | "success" | "empty" | "error";

export interface DashboardDataResult {
  data: DashboardData;
  status: DashboardDataStatus;
  error: string | null;
}
