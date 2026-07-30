import type {
  InsightKey,
  InsightEvidence,
  ExecutiveInsightDomainEvent,
} from "@/features/executive-insights/domain"
import type {
  ExecutiveInsightStatus,
  ExecutiveInsightSeverity,
  ExecutiveInsightCategory,
} from "@/features/executive-insights/types"

export interface NarrativeAlertInfo {
  readonly type: string
  readonly severity: string
  readonly title: string
  readonly summary: string
}

export interface ExecutiveNarrativeInput {
  readonly insightKey: InsightKey
  readonly title: string
  readonly summary: string
  readonly fact: string
  readonly context: string
  readonly impact: string
  readonly recommendation: string
  readonly module: string
  readonly category: ExecutiveInsightCategory
  readonly severity: ExecutiveInsightSeverity
  readonly status: ExecutiveInsightStatus
  readonly priority: number
  readonly evidence: InsightEvidence
  readonly relatedInsights: readonly string[]
  readonly version: number
  readonly firstDetectedAt: string
  readonly lastDetectedAt: string
  readonly occurrenceCount: number
  readonly resolvedAt: string | null
  readonly archivedAt: string | null
  readonly lastEvaluationRun: string
  readonly timelineEvents: readonly ExecutiveInsightDomainEvent[]
  readonly firstEvent: ExecutiveInsightDomainEvent | null
  readonly lastEvent: ExecutiveInsightDomainEvent | null
  readonly eventCountByType: Readonly<Record<string, number>>
  readonly activeAlerts: readonly NarrativeAlertInfo[]
  readonly sourceRunId: string
}
