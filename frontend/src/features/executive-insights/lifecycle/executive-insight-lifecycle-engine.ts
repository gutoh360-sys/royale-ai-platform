import type { ExecutiveInsight, InsightKey } from "@/features/executive-insights/domain"
import { ExecutiveInsightStatus } from "@/features/executive-insights/types"
import type { ExecutiveInsightRepository } from "@/features/executive-insights/repository"
import {
  ExecutiveInsightEventType,
  type ExecutiveInsightDomainEvent,
} from "@/features/executive-insights/domain/events"
import type { ExecutiveInsightTimeline } from "@/features/executive-insights/timeline"
import type { LifecycleContext } from "./lifecycle-context"
import type { LifecycleReconciliationResult } from "./lifecycle-reconciliation-result"
import type { LifecycleTransition } from "./lifecycle-transitions"
import { computeTransition } from "./lifecycle-transitions"

function applyLifecycleFields(
  base: ExecutiveInsight,
  existing: ExecutiveInsight | null,
  transition: ReturnType<typeof computeTransition>,
  context: LifecycleContext,
): ExecutiveInsight {
  const wasDetected = transition.transition !== "resolved"

  if (transition.transition === "ignored" && existing) {
    return existing
  }

  if (transition.transition === "unchanged" && existing) {
    return {
      ...existing,
      lastEvaluationRun: context.sourceRunId,
      updatedAt: context.refDate,
    }
  }

  const firstDetectedAt = existing?.firstDetectedAt ?? context.refDate
  const lastDetectedAt = wasDetected ? context.refDate : (existing?.lastDetectedAt ?? context.refDate)
  const occurrenceCount = existing && wasDetected ? existing.occurrenceCount + 1 : (existing?.occurrenceCount ?? 1)
  const version = existing ? existing.version + 1 : base.version

  let resolvedAt: Date | null = base.resolvedAt ?? null

  if (transition.transition === "resolved") {
    resolvedAt = context.refDate
  }

  if (transition.transition === "activated") {
    resolvedAt = null
  }

  return {
    ...base,
    status: transition.newStatus,
    firstDetectedAt,
    lastDetectedAt,
    occurrenceCount,
    lastEvaluationRun: context.sourceRunId,
    version,
    resolvedAt,
    archivedAt: base.archivedAt ?? null,
    createdAt: existing?.createdAt ?? base.createdAt,
    updatedAt: context.refDate,
  }
}

function transitionToEventType(transition: LifecycleTransition): ExecutiveInsightEventType {
  switch (transition) {
    case "created":
      return ExecutiveInsightEventType.CREATED
    case "activated":
      return ExecutiveInsightEventType.ACTIVATED
    case "updated":
      return ExecutiveInsightEventType.UPDATED
    case "resolved":
      return ExecutiveInsightEventType.RESOLVED
    case "archived":
      return ExecutiveInsightEventType.ARCHIVED
    case "reopened":
      return ExecutiveInsightEventType.REOPENED
    default:
      throw new Error(`Invalid transition for event: ${transition}`)
  }
}

function buildEventId(
  insightKey: InsightKey,
  eventType: ExecutiveInsightEventType,
  version: number,
): string {
  return `${insightKey}:${eventType}:${version}`
}

export class ExecutiveInsightLifecycleEngine {
  constructor(
    private readonly repository: ExecutiveInsightRepository,
    private readonly timeline: ExecutiveInsightTimeline,
  ) {}

  async reconcile(
    newInsights: readonly ExecutiveInsight[],
    context: LifecycleContext,
  ): Promise<LifecycleReconciliationResult> {
    const created: ExecutiveInsight[] = []
    const activated: ExecutiveInsight[] = []
    const updated: ExecutiveInsight[] = []
    const resolved: ExecutiveInsight[] = []
    const unchanged: ExecutiveInsight[] = []
    const ignored: ExecutiveInsight[] = []

    const processedKeys = new Set<string>()

    for (const newInsight of newInsights) {
      const key = newInsight.key
      const existing = await this.repository.findByKey(key)
      processedKeys.add(key)

      const transition = computeTransition(
        existing?.status ?? null,
        true,
      )

      if (transition.transition === "ignored") {
        ignored.push(existing!)
        continue
      }

      if (transition.transition === "unchanged" && existing) {
        unchanged.push(existing)
        continue
      }

      const reconciled = applyLifecycleFields(newInsight, existing, transition, context)
      const saved = await this.repository.save(reconciled)

      const eventType = transitionToEventType(transition.transition)
      const event: ExecutiveInsightDomainEvent = {
        id: buildEventId(key, eventType, saved.version),
        insightKey: key,
        type: eventType,
        timestamp: context.refDate,
        sourceRunId: context.sourceRunId,
        version: saved.version,
      }
      await this.timeline.append(event)

      if (transition.transition === "created") {
        created.push(saved)
      } else if (transition.transition === "activated") {
        activated.push(saved)
      } else {
        updated.push(saved)
      }
    }

    const activeInsights = await this.repository.findActive()
    for (const active of activeInsights) {
      if (!processedKeys.has(active.key)) {
        const transition = computeTransition(
          ExecutiveInsightStatus.ACTIVE,
          false,
        )
        const reconciled = applyLifecycleFields(active, active, transition, context)
        const saved = await this.repository.save(reconciled)

        const event: ExecutiveInsightDomainEvent = {
          id: buildEventId(active.key, ExecutiveInsightEventType.RESOLVED, saved.version),
          insightKey: active.key,
          type: ExecutiveInsightEventType.RESOLVED,
          timestamp: context.refDate,
          sourceRunId: context.sourceRunId,
          version: saved.version,
        }
        await this.timeline.append(event)

        resolved.push(saved)
      }
    }

    return {
      created,
      activated,
      updated,
      resolved,
      unchanged,
      ignored,
    }
  }

  async archive(
    key: InsightKey,
    context: LifecycleContext,
  ): Promise<ExecutiveInsightDomainEvent> {
    const insight = await this.repository.findByKey(key)
    if (!insight) {
      throw new Error(`Insight not found: ${key}`)
    }
    if (insight.status === ExecutiveInsightStatus.ARCHIVED) {
      throw new Error(`Insight already archived: ${key}`)
    }
    await this.repository.archive(insight.id)

    const event: ExecutiveInsightDomainEvent = {
      id: buildEventId(key, ExecutiveInsightEventType.ARCHIVED, insight.version),
      insightKey: key,
      type: ExecutiveInsightEventType.ARCHIVED,
      timestamp: context.refDate,
      sourceRunId: context.sourceRunId,
      version: insight.version,
    }
    await this.timeline.append(event)
    return event
  }

  async reopen(
    key: InsightKey,
    context: LifecycleContext,
  ): Promise<ExecutiveInsightDomainEvent> {
    const insight = await this.repository.findByKey(key)
    if (!insight) {
      throw new Error(`Insight not found: ${key}`)
    }
    if (insight.status !== ExecutiveInsightStatus.ARCHIVED) {
      throw new Error(`Insight is not archived: ${key}`)
    }
    const reopened = await this.repository.reopen(insight.id)

    const event: ExecutiveInsightDomainEvent = {
      id: buildEventId(key, ExecutiveInsightEventType.REOPENED, reopened.version),
      insightKey: key,
      type: ExecutiveInsightEventType.REOPENED,
      timestamp: context.refDate,
      sourceRunId: context.sourceRunId,
      version: reopened.version,
    }
    await this.timeline.append(event)
    return event
  }
}
