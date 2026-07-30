import type { ExecutiveInsightDomainEvent } from "../domain/events"
import type { InsightKey } from "../domain"

export interface ExecutiveInsightTimeline {
  append(event: ExecutiveInsightDomainEvent): Promise<void>
  findByKey(key: InsightKey): Promise<readonly ExecutiveInsightDomainEvent[]>
  findAll(): Promise<readonly ExecutiveInsightDomainEvent[]>
}
