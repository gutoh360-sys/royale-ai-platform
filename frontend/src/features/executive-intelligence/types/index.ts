import type { InventoryIntelligenceSummary } from "@/features/inventory-intelligence/types"
import type { MarketplaceSummaryData } from "@/features/marketplace/types"

export type ExecutiveInsightCategory =
  | "inventory"
  | "marketplace"
  | "financial"
  | "operations"
  | "sales"
  | "service"
  | "strategic"

export type ExecutiveSeverity =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "info"

export interface ExecutiveInsight {
  id: string
  title: string
  description: string
  category: ExecutiveInsightCategory
  severity: ExecutiveSeverity
  priority: number
  affectedDomains: string[]
  recommendedAction: string
  estimatedImpact: string
  confidence: number
  reasons: string[]
  createdAt: string
}

export interface ExecutiveIntelligenceInput {
  inventory: InventoryIntelligenceSummary
  marketplace: MarketplaceSummaryData
}

export interface ExecutiveRule {
  name: string
  execute(input: ExecutiveIntelligenceInput): ExecutiveInsight[]
}
