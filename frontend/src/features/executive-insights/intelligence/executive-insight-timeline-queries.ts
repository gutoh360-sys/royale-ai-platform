import type { ExecutiveInsightTimeline } from "@/features/executive-insights/timeline"
import type { ExecutiveInsightDomainEvent } from "@/features/executive-insights/domain"
import type { ExecutiveInsightEventType } from "@/features/executive-insights/domain/events"
import type { InsightKey } from "@/features/executive-insights/domain"

export class ExecutiveInsightTimelineQueries {
  constructor(
    private readonly timeline: ExecutiveInsightTimeline,
  ) {}

  async getFullHistory(
    key: InsightKey,
  ): Promise<readonly ExecutiveInsightDomainEvent[]> {
    return this.timeline.findByKey(key)
  }

  async findFirstEvent(
    key: InsightKey,
  ): Promise<ExecutiveInsightDomainEvent | null> {
    const events = await this.timeline.findByKey(key)
    return events.length > 0 ? events[0] : null
  }

  async findLastEvent(
    key: InsightKey,
  ): Promise<ExecutiveInsightDomainEvent | null> {
    const events = await this.timeline.findByKey(key)
    return events.length > 0 ? events[events.length - 1] : null
  }

  async countByType(
    key: InsightKey,
    type: ExecutiveInsightEventType,
  ): Promise<number> {
    const events = await this.timeline.findByKey(key)
    return events.filter((e) => e.type === type).length
  }
}
