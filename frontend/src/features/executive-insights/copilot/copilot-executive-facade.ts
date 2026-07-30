import type {
  ExecutiveInsight,
  InsightKey,
  ExecutiveInsightDomainEvent,
} from "@/features/executive-insights/domain"
import type { ExecutiveInsightAlert } from "@/features/executive-insights/intelligence"
import type { ExecutiveNarrativeOutput } from "@/features/executive-insights/narrative"
import type { ExecutiveIntelligenceEngine } from "@/features/executive-insights/intelligence"
import type { ExecutiveNarrativeEngine } from "@/features/executive-insights/narrative"

export class CopilotExecutiveFacade {
  constructor(
    private readonly intelligenceEngine: ExecutiveIntelligenceEngine,
    private readonly narrativeEngine: ExecutiveNarrativeEngine,
  ) {}

  async findAllInsights(): Promise<readonly ExecutiveInsight[]> {
    return this.intelligenceEngine.findAll()
  }

  async findInsightsByModule(module: string): Promise<readonly ExecutiveInsight[]> {
    return this.intelligenceEngine.findByModule(module)
  }

  async findCriticalInsights(): Promise<readonly ExecutiveInsight[]> {
    return this.intelligenceEngine.findCritical()
  }

  async findInsightByKey(
    key: InsightKey,
  ): Promise<ExecutiveInsight | null> {
    return this.intelligenceEngine.findByKey(key)
  }

  async findActiveInsights(): Promise<readonly ExecutiveInsight[]> {
    return this.intelligenceEngine.findActive()
  }

  async generateNarrative(
    key: InsightKey,
  ): Promise<ExecutiveNarrativeOutput | null> {
    const context = await this.intelligenceEngine.prepareNarrativeContext(key)
    if (!context) return null
    return this.narrativeEngine.generate(context)
  }

  async getTimeline(
    key: InsightKey,
  ): Promise<readonly ExecutiveInsightDomainEvent[]> {
    return this.intelligenceEngine.getTimeline(key)
  }

  async getFirstEvent(
    key: InsightKey,
  ): Promise<ExecutiveInsightDomainEvent | null> {
    return this.intelligenceEngine.getFirstEvent(key)
  }

  async getLastEvent(
    key: InsightKey,
  ): Promise<ExecutiveInsightDomainEvent | null> {
    return this.intelligenceEngine.getLastEvent(key)
  }

  async countEventsByType(
    key: InsightKey,
    type: string,
  ): Promise<number> {
    return this.intelligenceEngine.countEventsByType(
      key,
      type as never,
    )
  }

  async evaluateAlertForEvent(
    event: ExecutiveInsightDomainEvent,
  ): Promise<ExecutiveInsightAlert | null> {
    return this.intelligenceEngine.evaluateAlertsForEvent(event)
  }
}
