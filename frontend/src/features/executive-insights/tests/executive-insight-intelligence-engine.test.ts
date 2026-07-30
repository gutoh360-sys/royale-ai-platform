import { describe, it, expect, beforeEach } from "vitest"
import { InMemoryExecutiveInsightRepository } from "./in-memory-executive-insight-repository"
import { InMemoryExecutiveInsightTimeline } from "./in-memory-executive-insight-timeline"
import { ExecutiveIntelligenceEngine } from "@/features/executive-insights/intelligence"
import { ExecutiveInsightEventType } from "@/features/executive-insights"
import { ExecutiveInsightStatus } from "@/features/executive-insights/types"
import type { ExecutiveInsight, InsightKey } from "@/features/executive-insights/domain"
import type { ExecutiveInsightDomainEvent } from "@/features/executive-insights/domain"

const KEY_1 = "inventory:insight:ruptura" as InsightKey
const KEY_2 = "financial:insight:lucro" as InsightKey

const REF_DATE = new Date("2026-07-30")

function makeInsight(
  key: InsightKey,
  overrides: Partial<ExecutiveInsight> = {},
): ExecutiveInsight {
  return {
    key,
    id: `id-${key}`,
    module: "inventory",
    category: "INVENTORY" as const,
    severity: "INFO" as const,
    status: "NEW" as const,
    priority: 0,
    title: "T",
    summary: "S",
    fact: "F",
    context: "",
    impact: "",
    recommendation: "",
    evidence: { source: "test" },
    relatedInsights: [],
    metadata: {},
    version: 1,
    firstDetectedAt: REF_DATE,
    lastDetectedAt: REF_DATE,
    occurrenceCount: 1,
    lastEvaluationRun: "run-001",
    createdAt: REF_DATE,
    updatedAt: REF_DATE,
    resolvedAt: null,
    archivedAt: null,
    ...overrides,
  }
}

describe("ExecutiveIntelligenceEngine", () => {
  let repo: InMemoryExecutiveInsightRepository
  let timeline: InMemoryExecutiveInsightTimeline
  let engine: ExecutiveIntelligenceEngine

  beforeEach(async () => {
    repo = new InMemoryExecutiveInsightRepository()
    timeline = new InMemoryExecutiveInsightTimeline()
    engine = new ExecutiveIntelligenceEngine(repo, timeline)

    await repo.save(makeInsight(KEY_1, { status: "ACTIVE", severity: "CRITICAL", occurrenceCount: 3 }))
    await repo.save(makeInsight(KEY_2, { status: "RESOLVED", severity: "INFO" }))
  })

  it("findActive returns only ACTIVE insights", async () => {
    const active = await engine.findActive()
    expect(active).toHaveLength(1)
    expect(active[0].key).toBe(KEY_1)
  })

  it("findResolved returns only RESOLVED insights", async () => {
    const resolved = await engine.findResolved()
    expect(resolved).toHaveLength(1)
    expect(resolved[0].key).toBe(KEY_2)
  })

  it("findByKey returns matching insight", async () => {
    const insight = await engine.findByKey(KEY_1)
    expect(insight).not.toBeNull()
    expect(insight!.key).toBe(KEY_1)
  })

  it("findByKey returns null for unknown key", async () => {
    const insight = await engine.findByKey("unknown:key" as InsightKey)
    expect(insight).toBeNull()
  })

  it("findCritical returns only CRITICAL insights", async () => {
    const critical = await engine.findCritical()
    expect(critical).toHaveLength(1)
    expect(critical[0].key).toBe(KEY_1)
  })

  it("findAll returns all insights", async () => {
    const all = await engine.findAll()
    expect(all).toHaveLength(2)
  })

  it("findByStatus filters correctly", async () => {
    const newInsights = await engine.findByStatus(ExecutiveInsightStatus.NEW)
    expect(newInsights).toHaveLength(0)

    const active = await engine.findByStatus(ExecutiveInsightStatus.ACTIVE)
    expect(active).toHaveLength(1)
  })

  it("getTimeline returns events for a key", async () => {
    await timeline.append({
      id: `${KEY_1}:CREATED:1`,
      insightKey: KEY_1,
      type: ExecutiveInsightEventType.CREATED,
      timestamp: REF_DATE,
      sourceRunId: "run-001",
      version: 1,
    })

    const events = await engine.getTimeline(KEY_1)
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe(ExecutiveInsightEventType.CREATED)
  })

  it("getFullHistory delegates to timeline queries", async () => {
    await timeline.append({
      id: `${KEY_1}:CREATED:1`,
      insightKey: KEY_1,
      type: ExecutiveInsightEventType.CREATED,
      timestamp: REF_DATE,
      sourceRunId: "run-001",
      version: 1,
    })

    const history = await engine.getFullHistory(KEY_1)
    expect(history).toHaveLength(1)
  })

  it("getFirstEvent returns first event", async () => {
    await timeline.append({
      id: `${KEY_1}:CREATED:1`,
      insightKey: KEY_1,
      type: ExecutiveInsightEventType.CREATED,
      timestamp: REF_DATE,
      sourceRunId: "run-001",
      version: 1,
    })
    await timeline.append({
      id: `${KEY_1}:ACTIVATED:2`,
      insightKey: KEY_1,
      type: ExecutiveInsightEventType.ACTIVATED,
      timestamp: REF_DATE,
      sourceRunId: "run-002",
      version: 2,
    })

    const first = await engine.getFirstEvent(KEY_1)
    expect(first!.type).toBe(ExecutiveInsightEventType.CREATED)
  })

  it("getLastEvent returns last event", async () => {
    await timeline.append({
      id: `${KEY_1}:CREATED:1`,
      insightKey: KEY_1,
      type: ExecutiveInsightEventType.CREATED,
      timestamp: REF_DATE,
      sourceRunId: "run-001",
      version: 1,
    })
    await timeline.append({
      id: `${KEY_1}:ACTIVATED:2`,
      insightKey: KEY_1,
      type: ExecutiveInsightEventType.ACTIVATED,
      timestamp: REF_DATE,
      sourceRunId: "run-002",
      version: 2,
    })

    const last = await engine.getLastEvent(KEY_1)
    expect(last!.type).toBe(ExecutiveInsightEventType.ACTIVATED)
  })

  it("countEventsByType returns correct count", async () => {
    await timeline.append({
      id: `${KEY_1}:CREATED:1`,
      insightKey: KEY_1,
      type: ExecutiveInsightEventType.CREATED,
      timestamp: REF_DATE,
      sourceRunId: "run-001",
      version: 1,
    })
    await timeline.append({
      id: `${KEY_1}:ACTIVATED:2`,
      insightKey: KEY_1,
      type: ExecutiveInsightEventType.ACTIVATED,
      timestamp: REF_DATE,
      sourceRunId: "run-002",
      version: 2,
    })

    const count = await engine.countEventsByType(KEY_1, ExecutiveInsightEventType.ACTIVATED)
    expect(count).toBe(1)
  })

  it("evaluateAlertsForEvent delegates to alert engine", async () => {
    const event: ExecutiveInsightDomainEvent = {
      id: `${KEY_1}:REOPENED:1`,
      insightKey: KEY_1,
      type: ExecutiveInsightEventType.REOPENED,
      timestamp: REF_DATE,
      sourceRunId: "run-003",
      version: 1,
    }
    const alert = await engine.evaluateAlertsForEvent(event)
    expect(alert).not.toBeNull()
    expect(alert!.type).toBe("REOPENED")
  })

  it("exposes alertEngine instance", () => {
    expect(engine.alertEngine).toBeDefined()
  })

  it("prepareNarrativeContext returns narrative input for existing key", async () => {
    await timeline.append({
      id: `${KEY_1}:CREATED:1`,
      insightKey: KEY_1,
      type: ExecutiveInsightEventType.CREATED,
      timestamp: REF_DATE,
      sourceRunId: "run-001",
      version: 1,
    })

    const ctx = await engine.prepareNarrativeContext(KEY_1)

    expect(ctx).not.toBeNull()
    expect(ctx!.insightKey).toBe(KEY_1)
    expect(ctx!.title).toBe("T")
    expect(ctx!.severity).toBe("CRITICAL")
    expect(ctx!.status).toBe("ACTIVE")
    expect(ctx!.timelineEvents).toHaveLength(1)
    expect(ctx!.eventCountByType["CREATED"]).toBe(1)
    expect(ctx!.activeAlerts).toHaveLength(0)
    expect(ctx!.sourceRunId).toBe("run-001")
  })

  it("prepareNarrativeContext returns null for unknown key", async () => {
    const ctx = await engine.prepareNarrativeContext("unknown:key" as InsightKey)
    expect(ctx).toBeNull()
  })

  it("prepareNarrativeContext does not leak repository or timeline references", async () => {
    const ctx = await engine.prepareNarrativeContext(KEY_1)

    expect(ctx).not.toBeNull()
    const ctxRecord = ctx as unknown as Record<string, unknown>
    expect(ctxRecord.repository).toBeUndefined()
    expect(ctxRecord.timeline).toBeUndefined()
    expect(ctxRecord.alertEngine).toBeUndefined()
  })
})
