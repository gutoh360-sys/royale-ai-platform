import { describe, it, expect, beforeEach } from "vitest"
import { InMemoryExecutiveInsightRepository } from "./in-memory-executive-insight-repository"
import { InMemoryExecutiveInsightTimeline } from "./in-memory-executive-insight-timeline"
import {
  ExecutiveInsightLifecycleEngine,
  type LifecycleContext,
} from "@/features/executive-insights/lifecycle"
import { ExecutiveInsightStatus, ExecutiveInsightEventType } from "@/features/executive-insights"
import type { ExecutiveInsight, InsightKey } from "@/features/executive-insights/domain"

const KEY_1 = "inventory:insight:ruptura" as InsightKey
const KEY_2 = "financial:insight:lucro" as InsightKey

const REF_DATE_1 = new Date("2026-07-28")
const REF_DATE_2 = new Date("2026-07-29")
const REF_DATE_3 = new Date("2026-07-30")

const CTX_1: LifecycleContext = { refDate: REF_DATE_1, sourceRunId: "run-001" }
const CTX_2: LifecycleContext = { refDate: REF_DATE_2, sourceRunId: "run-002" }
const CTX_3: LifecycleContext = { refDate: REF_DATE_3, sourceRunId: "run-003" }

function makeInsight(
  key: InsightKey,
  status: string = "NEW",
  overrides: Partial<ExecutiveInsight> = {},
): ExecutiveInsight {
  const base: ExecutiveInsight = {
    key,
    id: `id-${key}`,
    module: "inventory",
    category: "INVENTORY" as const,
    severity: "INFO" as const,
    status: status as "NEW" | "ACTIVE" | "RESOLVED" | "ARCHIVED",
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
    firstDetectedAt: REF_DATE_1,
    lastDetectedAt: REF_DATE_1,
    occurrenceCount: 1,
    lastEvaluationRun: "run-001",
    createdAt: REF_DATE_1,
    updatedAt: REF_DATE_1,
    resolvedAt: null,
    archivedAt: null,
    ...overrides,
  }
  if (status === "RESOLVED") base.resolvedAt = REF_DATE_1
  if (status === "ARCHIVED") base.archivedAt = REF_DATE_1
  return base
}

describe("ExecutiveInsightTimeline — events emitted during reconcile", () => {
  let repo: InMemoryExecutiveInsightRepository
  let timeline: InMemoryExecutiveInsightTimeline
  let engine: ExecutiveInsightLifecycleEngine

  beforeEach(() => {
    repo = new InMemoryExecutiveInsightRepository()
    timeline = new InMemoryExecutiveInsightTimeline()
    engine = new ExecutiveInsightLifecycleEngine(repo, timeline)
  })

  it("emits CREATED event on first detection", async () => {
    await engine.reconcile([makeInsight(KEY_1)], CTX_1)

    const events = await timeline.findAll()
    expect(events).toHaveLength(1)
    expect(events[0].insightKey).toBe(KEY_1)
    expect(events[0].type).toBe(ExecutiveInsightEventType.CREATED)
    expect(events[0].timestamp).toBe(REF_DATE_1)
    expect(events[0].sourceRunId).toBe("run-001")
    expect(events[0].version).toBe(1)
  })

  it("emits ACTIVATED event on NEW→ACTIVE transition", async () => {
    await engine.reconcile([makeInsight(KEY_1)], CTX_1)
    await engine.reconcile([makeInsight(KEY_1)], CTX_2)

    const events = await timeline.findByKey(KEY_1)
    expect(events).toHaveLength(2)
    expect(events[1].type).toBe(ExecutiveInsightEventType.ACTIVATED)
    expect(events[1].version).toBe(2)
    expect(events[1].sourceRunId).toBe("run-002")
  })

  it("emits UPDATED event on ACTIVE→ACTIVE transition", async () => {
    await engine.reconcile([makeInsight(KEY_1)], CTX_1)
    await engine.reconcile([makeInsight(KEY_1)], CTX_2)
    await engine.reconcile([makeInsight(KEY_1)], CTX_3)

    const events = await timeline.findByKey(KEY_1)
    expect(events).toHaveLength(3)
    expect(events[2].type).toBe(ExecutiveInsightEventType.UPDATED)
    expect(events[2].version).toBe(3)
  })

  it("emits RESOLVED event on ACTIVE→RESOLVED transition", async () => {
    await engine.reconcile([makeInsight(KEY_1)], CTX_1)
    await engine.reconcile([makeInsight(KEY_1)], CTX_2)
    await engine.reconcile([makeInsight(KEY_2)], CTX_3)

    const events = await timeline.findByKey(KEY_1)
    expect(events).toHaveLength(3)
    expect(events[2].type).toBe(ExecutiveInsightEventType.RESOLVED)
    expect(events[2].version).toBe(3)
    expect(events[2].timestamp).toBe(REF_DATE_3)
  })

  it("emits ACTIVATED event on RESOLVED→ACTIVE transition (reactivation)", async () => {
    await engine.reconcile([makeInsight(KEY_1)], CTX_1)
    await engine.reconcile([makeInsight(KEY_1)], CTX_2)
    await engine.reconcile([makeInsight(KEY_2)], CTX_3)
    await engine.reconcile([makeInsight(KEY_1)], CTX_3)

    const events = await timeline.findByKey(KEY_1)
    expect(events).toHaveLength(4)
    expect(events[3].type).toBe(ExecutiveInsightEventType.ACTIVATED)
    expect(events[3].version).toBe(4)
  })

  it("does not emit events for ignored (ARCHIVED) insights", async () => {
    await engine.reconcile([makeInsight(KEY_1)], CTX_1)
    await engine.reconcile([makeInsight(KEY_1)], CTX_2)

    const active = await repo.findActive()
    await repo.archive(active[0].id)
    timeline.clear()

    await engine.reconcile([makeInsight(KEY_1)], CTX_3)
    const events = await timeline.findAll()
    expect(events).toHaveLength(0)
  })

  it("emits ARCHIVED event via engine.archive()", async () => {
    await engine.reconcile([makeInsight(KEY_1)], CTX_1)
    await engine.reconcile([makeInsight(KEY_1)], CTX_2)

    const event = await engine.archive(KEY_1, CTX_3)

    expect(event.type).toBe(ExecutiveInsightEventType.ARCHIVED)
    expect(event.insightKey).toBe(KEY_1)
    expect(event.timestamp).toBe(REF_DATE_3)
    expect(event.sourceRunId).toBe("run-003")
    expect(event.version).toBe(2)

    const archived = await repo.findByKey(KEY_1)
    expect(archived?.status).toBe(ExecutiveInsightStatus.ARCHIVED)
  })

  it("emits REOPENED event via engine.reopen()", async () => {
    await engine.reconcile([makeInsight(KEY_1)], CTX_1)
    await engine.reconcile([makeInsight(KEY_1)], CTX_2)
    await engine.archive(KEY_1, CTX_3)

    const event = await engine.reopen(KEY_1, CTX_3)

    expect(event.type).toBe(ExecutiveInsightEventType.REOPENED)
    expect(event.insightKey).toBe(KEY_1)
    expect(event.version).toBe(2)

    const reopened = await repo.findByKey(KEY_1)
    expect(reopened?.status).toBe(ExecutiveInsightStatus.ACTIVE)
    expect(reopened?.resolvedAt).toBeNull()
  })

  it("archive() throws if insight not found", async () => {
    await expect(engine.archive(KEY_1, CTX_1)).rejects.toThrow("Insight not found")
  })

  it("archive() throws if already archived", async () => {
    await engine.reconcile([makeInsight(KEY_1)], CTX_1)
    await engine.archive(KEY_1, CTX_2)
    await expect(engine.archive(KEY_1, CTX_3)).rejects.toThrow("Insight already archived")
  })

  it("reopen() throws if insight not found", async () => {
    await expect(engine.reopen(KEY_1, CTX_1)).rejects.toThrow("Insight not found")
  })

  it("reopen() throws if not archived", async () => {
    await engine.reconcile([makeInsight(KEY_1)], CTX_1)
    await expect(engine.reopen(KEY_1, CTX_2)).rejects.toThrow("Insight is not archived")
  })

  it("events have deterministic IDs", async () => {
    await engine.reconcile([makeInsight(KEY_1)], CTX_1)

    const events = await timeline.findAll()
    const expectedId = `${KEY_1}:CREATED:1`
    expect(events[0].id).toBe(expectedId)
  })

  it("events are immutable copies", async () => {
    await engine.reconcile([makeInsight(KEY_1)], CTX_1)
    const events = await timeline.findAll()
    const originalType = events[0].type
    ;(events[0] as unknown as Record<string, unknown>).type = "MUTATED"
    const eventsAgain = await timeline.findAll()
    expect(eventsAgain[0].type).toBe(originalType)
  })
})

describe("ExecutiveInsightTimeline — multiple keys produce separate event streams", () => {
  it("each InsightKey has its own ordered event list", async () => {
    const repo = new InMemoryExecutiveInsightRepository()
    const timeline = new InMemoryExecutiveInsightTimeline()
    const engine = new ExecutiveInsightLifecycleEngine(repo, timeline)

    await engine.reconcile([makeInsight(KEY_1), makeInsight(KEY_2)], CTX_1)

    const events1 = await timeline.findByKey(KEY_1)
    const events2 = await timeline.findByKey(KEY_2)
    expect(events1).toHaveLength(1)
    expect(events2).toHaveLength(1)
    expect(events1[0].insightKey).toBe(KEY_1)
    expect(events2[0].insightKey).toBe(KEY_2)
  })
})
