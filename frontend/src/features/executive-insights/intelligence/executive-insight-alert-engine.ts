import type { ExecutiveInsight } from "@/features/executive-insights/domain"
import type { ExecutiveInsightDomainEvent } from "@/features/executive-insights/domain"
import { ExecutiveInsightEventType } from "@/features/executive-insights/domain/events"
import {
  ExecutiveInsightAlertType,
  type ExecutiveInsightAlert,
  type ExecutiveInsightAlertType as AlertType,
} from "./executive-insight-alert"
import type { ExecutiveInsightSeverity } from "@/features/executive-insights/types"

export class ExecutiveInsightAlertEngine {

  evaluate(
    event: ExecutiveInsightDomainEvent,
    insight: ExecutiveInsight | null,
  ): ExecutiveInsightAlert | null {
    if (event.type === ExecutiveInsightEventType.REOPENED) {
      return this.buildAlert(event, insight, ExecutiveInsightAlertType.REOPENED)
    }

    if (event.type === ExecutiveInsightEventType.RESOLVED) {
      return this.buildAlert(event, insight, ExecutiveInsightAlertType.RESOLVED)
    }

    if (event.type === ExecutiveInsightEventType.ARCHIVED) {
      return this.buildAlert(event, insight, ExecutiveInsightAlertType.ARCHIVED)
    }

    return null
  }

  evaluateAll(
    events: readonly ExecutiveInsightDomainEvent[],
    getInsight: (key: string) => Promise<ExecutiveInsight | null>,
  ): Promise<ExecutiveInsightAlert[]> {
    return events.reduce(
      async (accPromise, event) => {
        const acc = await accPromise
        const insight = await getInsight(event.insightKey)
        const alert = this.evaluate(event, insight)
        if (alert) acc.push(alert)
        return acc
      },
      Promise.resolve([] as ExecutiveInsightAlert[]),
    )
  }

  private buildAlert(
    event: ExecutiveInsightDomainEvent,
    insight: ExecutiveInsight | null,
    type: AlertType,
  ): ExecutiveInsightAlert {
    const severity: ExecutiveInsightSeverity =
      insight?.severity ?? ("INFO" as ExecutiveInsightSeverity)

    return {
      id: `alert:${event.id}`,
      insightKey: event.insightKey,
      type,
      severity,
      title: this.resolveTitle(type),
      summary: this.resolveSummary(type, event.insightKey),
      timestamp: event.timestamp,
      sourceRunId: event.sourceRunId,
    }
  }

  private resolveTitle(type: AlertType): string {
    switch (type) {
      case "REOPENED":
        return "Insight reaberto"
      case "RESOLVED":
        return "Insight resolvido"
      case "ARCHIVED":
        return "Insight arquivado"
    }
  }

  private resolveSummary(type: AlertType, key: string): string {
    switch (type) {
      case "REOPENED":
        return `O insight ${key} foi reaberto`
      case "RESOLVED":
        return `O insight ${key} foi resolvido`
      case "ARCHIVED":
        return `O insight ${key} foi arquivado`
    }
  }
}
