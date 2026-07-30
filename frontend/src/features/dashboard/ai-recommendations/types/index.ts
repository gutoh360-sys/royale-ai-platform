export type InsightPriority = "high" | "medium" | "low";
export type InsightCategory = "sales" | "inventory" | "marketplace" | "trend";

export interface AIRecommendationData {
  id: string;
  title: string;
  summary: string;
  priority: InsightPriority;
  category: InsightCategory;
  actionLabel: string;
  confidence: number;
  generatedAt: string;
}

export type AIRecommendationsState = "loading" | "success" | "empty" | "error";
