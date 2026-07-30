import type { InsightKey } from "@/features/executive-insights/domain"
import type { ExecutiveInsightSeverity } from "@/features/executive-insights/types"

export const ExecutiveInsightAlertType = {
  REOPENED: "REOPENED",
  RESOLVED: "RESOLVED",
  ARCHIVED: "ARCHIVED",
} as const

export type ExecutiveInsightAlertType =
  (typeof ExecutiveInsightAlertType)[keyof typeof ExecutiveInsightAlertType]

export interface ExecutiveInsightAlert {
  readonly id: string
  readonly insightKey: InsightKey
  readonly type: ExecutiveInsightAlertType
  readonly severity: ExecutiveInsightSeverity
  readonly title: string
  readonly summary: string
  readonly timestamp: Date
  readonly sourceRunId: string
}
