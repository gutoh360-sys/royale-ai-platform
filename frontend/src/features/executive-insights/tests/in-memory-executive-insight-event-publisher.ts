import type { ExecutiveInsightEventPublisher } from "@/features/executive-insights/intelligence"
import type { ExecutiveInsightDomainEvent } from "@/features/executive-insights/domain"

export class InMemoryExecutiveInsightEventPublisher
  implements ExecutiveInsightEventPublisher
{
  readonly published: ExecutiveInsightDomainEvent[] = []

  async publish(event: ExecutiveInsightDomainEvent): Promise<void> {
    this.published.push({ ...event })
  }

  clear(): void {
    this.published.length = 0
  }
}
