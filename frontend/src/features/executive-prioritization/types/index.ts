import type { ExecutiveSeverity, ExecutiveInsightCategory } from "@/features/executive-intelligence/types"

export type Urgency = "immediate" | "today" | "this_week" | "monitor"

export type Complexity = "easy" | "medium" | "complex"

export interface ExecutivePriority {
  id: string
  rank: number
  title: string
  description: string
  recommendedAction: string
  whyNow: string
  priorityScore: number
  urgency: Urgency
  estimatedImpact: string
  blockedBy: string[]
  relatedInsights: string[]
  severity: ExecutiveSeverity
  reasons: string[]
  category: ExecutiveInsightCategory
}
