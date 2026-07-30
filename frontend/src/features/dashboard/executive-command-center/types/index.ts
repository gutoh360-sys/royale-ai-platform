export type AttentionPriority = "critical" | "high" | "medium" | "low";
export type AttentionCategory = "inventory" | "marketplace" | "financial" | "integration" | "sales" | "system";

export interface ExecutiveStatusData {
  healthScore: number;
  label: string;
  summary: string;
}

export interface AttentionItem {
  id: string;
  priority: AttentionPriority;
  category: AttentionCategory;
  description: string;
}

export interface OpportunityItem {
  id: string;
  description: string;
}

export interface ExecutiveRecommendationData {
  id: string;
  action: string;
  reason: string;
  impact: string;
  priority: AttentionPriority;
}

export interface CommandCenterData {
  status: ExecutiveStatusData;
  attention: AttentionItem[];
  opportunities: OpportunityItem[];
  recommendations: ExecutiveRecommendationData[];
}

export type CommandCenterState = "loading" | "success" | "empty" | "error";

export interface CommandCenterResult {
  data: CommandCenterData;
  status: CommandCenterState;
  error: string | null;
}
