import type { InventoryAnalysis, InventoryIntelligenceSummary } from "@/features/inventory-intelligence/types";

export type FilterMode = "all" | "critical" | "risk" | "slow" | "healthy";

export interface InventoryDecisionData {
  summary: InventoryIntelligenceSummary;
  analyses: InventoryAnalysis[];
  observations: string[];
}
