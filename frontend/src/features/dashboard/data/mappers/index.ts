import type { ExecutiveMetric } from "@/features/dashboard/executive-summary/types";
import type { AIRecommendationData } from "@/features/dashboard/ai-recommendations/types";
import type { AlertData } from "@/features/dashboard/alerts-center/types";

export function mapMetrics(raw: ExecutiveMetric[]): ExecutiveMetric[] {
  return raw;
}

export function mapRecommendations(raw: AIRecommendationData[]): AIRecommendationData[] {
  return raw;
}

export function mapAlerts(raw: AlertData[]): AlertData[] {
  return raw;
}
