import type { ExecutiveInsightTimeline } from "@/features/executive-insights/timeline"
import type { ExecutiveInsightDomainEvent } from "@/features/executive-insights/domain"
import type { InsightKey } from "@/features/executive-insights/domain"

export class InMemoryExecutiveInsightTimeline
  implements ExecutiveInsightTimeline
{
  private readonly store: ExecutiveInsightDomainEvent[] = []

  async append(event: ExecutiveInsightDomainEvent): Promise<void> {
    this.store.push({ ...event })
  }

  async findByKey(key: InsightKey): Promise<readonly ExecutiveInsightDomainEvent[]> {
    return this.store
      .filter((e) => e.insightKey === key)
      .map((e) => ({ ...e }))
  }

  async findAll(): Promise<readonly ExecutiveInsightDomainEvent[]> {
    return this.store.map((e) => ({ ...e }))
  }

  clear(): void {
    this.store.length = 0
  }

  count(): number {
    return this.store.length
  }
}
