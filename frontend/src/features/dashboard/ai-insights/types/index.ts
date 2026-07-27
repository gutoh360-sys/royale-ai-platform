export type InsightPriority = "high" | "medium" | "low";
export type InsightCategory = "sales" | "inventory" | "marketplace" | "trend";

export interface AIInsightItemData {
  id: string;
  title: string;
  summary: string;
  priority: InsightPriority;
  category: InsightCategory;
  actionLabel: string;
  confidence: number;
  generatedAt: string;
}

export type AIInsightsState = "loading" | "success" | "empty" | "error";
