import type { ExecutiveInsightDomainEvent } from "@/features/executive-insights/domain"

export interface ExecutiveInsightEventPublisher {
  publish(event: ExecutiveInsightDomainEvent): Promise<void>
}
