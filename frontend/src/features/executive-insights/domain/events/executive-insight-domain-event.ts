import type { InsightKey } from "../insight-key"
import type { ExecutiveInsightEventType } from "./executive-insight-event-type"

export interface ExecutiveInsightDomainEvent {
  readonly id: string
  readonly insightKey: InsightKey
  readonly type: ExecutiveInsightEventType
  readonly timestamp: Date
  readonly sourceRunId: string
  readonly version: number
}
