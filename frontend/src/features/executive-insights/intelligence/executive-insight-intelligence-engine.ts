import type {
  ExecutiveInsight,
  InsightKey,
  ExecutiveInsightDomainEvent,
} from "@/features/executive-insights/domain"
import { ExecutiveInsightStatus } from "@/features/executive-insights/types"
import type { ExecutiveInsightRepository } from "@/features/executive-insights/repository"
import type { ExecutiveInsightTimeline } from "@/features/executive-insights/timeline"
import type { ExecutiveInsightEventType } from "@/features/executive-insights/domain/events"
import { ExecutiveInsightTimelineQueries } from "./executive-insight-timeline-queries"
import type { ExecutiveInsightAlert } from "./executive-insight-alert"
import { ExecutiveInsightAlertEngine } from "./executive-insight-alert-engine"
import type {
  ExecutiveNarrativeInput,
  NarrativeAlertInfo,
} from "@/features/executive-insights/narrative/executive-narrative-input"

export interface IntelligenceEngineConfig {
  readonly alertEngine: ExecutiveInsightAlertEngine
}

export class ExecutiveIntelligenceEngine {
  private readonly queries: ExecutiveInsightTimelineQueries

  constructor(
    private readonly repository: ExecutiveInsightRepository,
    private readonly timeline: ExecutiveInsightTimeline,
    config?: Partial<IntelligenceEngineConfig>,
  ) {
    this.queries = new ExecutiveInsightTimelineQueries(timeline)
    this.alertEngine = config?.alertEngine ?? new ExecutiveInsightAlertEngine()
  }

  readonly alertEngine: ExecutiveInsightAlertEngine

  async findActive(): Promise<readonly ExecutiveInsight[]> {
    return this.repository.findActive()
  }

  async findNew(): Promise<readonly ExecutiveInsight[]> {
    return this.repository.findByStatus(ExecutiveInsightStatus.NEW)
  }

  async findResolved(): Promise<readonly ExecutiveInsight[]> {
    return this.repository.findByStatus(ExecutiveInsightStatus.RESOLVED)
  }

  async findArchived(): Promise<readonly ExecutiveInsight[]> {
    return this.repository.findByStatus(ExecutiveInsightStatus.ARCHIVED)
  }

  async findByKey(key: InsightKey): Promise<ExecutiveInsight | null> {
    return this.repository.findByKey(key)
  }

  async findByStatus(
    status: ExecutiveInsightStatus,
  ): Promise<readonly ExecutiveInsight[]> {
    return this.repository.findByStatus(status)
  }

  async findByModule(module: string): Promise<readonly ExecutiveInsight[]> {
    return this.repository.findByModule(module)
  }

  async findAll(): Promise<readonly ExecutiveInsight[]> {
    return this.repository.findAll()
  }

  async findCritical(): Promise<readonly ExecutiveInsight[]> {
    const all = await this.repository.findAll()
    return all.filter((i) => i.severity === "CRITICAL")
  }

  async getTimeline(key: InsightKey): Promise<readonly ExecutiveInsightDomainEvent[]> {
    return this.timeline.findByKey(key)
  }

  async getFullHistory(
    key: InsightKey,
  ): Promise<readonly ExecutiveInsightDomainEvent[]> {
    return this.queries.getFullHistory(key)
  }

  async getFirstEvent(
    key: InsightKey,
  ): Promise<ExecutiveInsightDomainEvent | null> {
    return this.queries.findFirstEvent(key)
  }

  async getLastEvent(
    key: InsightKey,
  ): Promise<ExecutiveInsightDomainEvent | null> {
    return this.queries.findLastEvent(key)
  }

  async countEventsByType(
    key: InsightKey,
    type: ExecutiveInsightEventType,
  ): Promise<number> {
    return this.queries.countByType(key, type)
  }

  async evaluateAlertsForEvent(
    event: ExecutiveInsightDomainEvent,
  ): Promise<ExecutiveInsightAlert | null> {
    const insight = await this.repository.findByKey(event.insightKey)
    return this.alertEngine.evaluate(event, insight)
  }

  async prepareNarrativeContext(
    key: InsightKey,
  ): Promise<ExecutiveNarrativeInput | null> {
    const insight = await this.repository.findByKey(key)
    if (!insight) return null

    const events = await this.timeline.findByKey(key)
    const firstEvent = events.length > 0 ? events[0] : null
    const lastEvent = events.length > 0 ? events[events.length - 1] : null

    const eventCountByType: Record<string, number> = {}
    for (const event of events) {
      eventCountByType[event.type] = (eventCountByType[event.type] ?? 0) + 1
    }

    const alerts: NarrativeAlertInfo[] = []
    for (const event of events) {
      const alert = this.alertEngine.evaluate(event, insight)
      if (alert) {
        alerts.push({
          type: alert.type,
          severity: alert.severity,
          title: alert.title,
          summary: alert.summary,
        })
      }
    }

    return {
      insightKey: insight.key,
      title: insight.title,
      summary: insight.summary,
      fact: insight.fact,
      context: insight.context,
      impact: insight.impact,
      recommendation: insight.recommendation,
      module: insight.module,
      category: insight.category,
      severity: insight.severity,
      status: insight.status,
      priority: insight.priority,
      evidence: insight.evidence,
      relatedInsights: insight.relatedInsights,
      version: insight.version,
      firstDetectedAt: insight.firstDetectedAt.toISOString(),
      lastDetectedAt: insight.lastDetectedAt.toISOString(),
      occurrenceCount: insight.occurrenceCount,
      resolvedAt: insight.resolvedAt?.toISOString() ?? null,
      archivedAt: insight.archivedAt?.toISOString() ?? null,
      lastEvaluationRun: insight.lastEvaluationRun,
      timelineEvents: events,
      firstEvent,
      lastEvent,
      eventCountByType,
      activeAlerts: alerts,
      sourceRunId: insight.lastEvaluationRun,
    }
  }
}
