import type {
  ExecutiveInsightStatus,
  ExecutiveInsightSeverity,
  ExecutiveInsightCategory,
} from "@/features/executive-insights/types"
import type { InsightEvidence } from "./insight-evidence"
import type { InsightKey } from "./insight-key"

export interface ExecutiveInsight {
  key: InsightKey
  id: string
  module: string
  category: ExecutiveInsightCategory
  severity: ExecutiveInsightSeverity
  status: ExecutiveInsightStatus
  priority: number
  title: string
  summary: string
  fact: string
  context: string
  impact: string
  recommendation: string
  evidence: InsightEvidence
  relatedInsights: string[]
  metadata: Record<string, unknown>
  version: number
  firstDetectedAt: Date
  lastDetectedAt: Date
  occurrenceCount: number
  lastEvaluationRun: string
  createdAt: Date
  updatedAt: Date
  resolvedAt: Date | null
  archivedAt: Date | null
}
