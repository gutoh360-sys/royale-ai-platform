import type { MarketplaceSummaryData } from "@/features/marketplace/types"
import type { InventoryIntelligenceSummary } from "@/features/inventory-intelligence/types"
import type { ExecutiveInsight } from "@/features/executive-intelligence/types"

export type TimelineDirection = "improved" | "worsened" | "unchanged"

export type TimelineCategory = "marketplace" | "inventory" | "executive"

export interface ExecutiveSnapshot {
  snapshotId: string
  createdAt: string
  marketplaceSummary: MarketplaceSummaryData
  inventorySummary: InventoryIntelligenceSummary
  executiveSummary: ExecutiveInsight[]
}

export interface ExecutiveTimelineEvent {
  id: string
  category: TimelineCategory
  title: string
  description: string
  direction: TimelineDirection
  severity: "critical" | "high" | "medium" | "low" | "info"
  impact: string
  priority: number
  timestamp: string
}

export interface ExecutiveTimelineResult {
  events: ExecutiveTimelineEvent[]
  state: "success" | "empty"
}
