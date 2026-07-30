import { describe, it, expect } from "vitest"
import { ExecutiveInsightAlertEngine } from "@/features/executive-insights/intelligence"
import { ExecutiveInsightAlertType } from "@/features/executive-insights/intelligence"
import { ExecutiveInsightEventType } from "@/features/executive-insights"
import type { ExecutiveInsight, InsightKey } from "@/features/executive-insights/domain"
import type { ExecutiveInsightDomainEvent } from "@/features/executive-insights/domain"

const KEY = "inventory:insight:ruptura" as InsightKey

function makeEvent(
  type: ExecutiveInsightEventType,
  overrides: Partial<ExecutiveInsightDomainEvent> = {},
): ExecutiveInsightDomainEvent {
  return {
    id: `${KEY}:${type}:1`,
    insightKey: KEY,
    type,
    timestamp: new Date("2026-07-30"),
    sourceRunId: "run-001",
    version: 1,
    ...overrides,
  }
}

function makeInsight(
  overrides: Partial<ExecutiveInsight> = {},
): ExecutiveInsight {
  return {
    key: KEY,
    id: "id-1",
    module: "inventory",
    category: "INVENTORY" as const,
    severity: "INFO" as const,
    status: "ACTIVE" as const,
    priority: 0,
    title: "Teste",
    summary: "Sumário",
    fact: "Fato",
    context: "",
    impact: "",
    recommendation: "",
    evidence: { source: "test" },
    relatedInsights: [],
    metadata: {},
    version: 1,
    firstDetectedAt: new Date("2026-07-28"),
    lastDetectedAt: new Date("2026-07-29"),
    occurrenceCount: 1,
    lastEvaluationRun: "run-001",
    createdAt: new Date("2026-07-28"),
    updatedAt: new Date("2026-07-29"),
    resolvedAt: null,
    archivedAt: null,
    ...overrides,
  }
}

describe("ExecutiveInsightAlertEngine", () => {
  it("returns REOPENED alert for REOPENED event", () => {
    const engine = new ExecutiveInsightAlertEngine()
    const event = makeEvent(ExecutiveInsightEventType.REOPENED)
    const alert = engine.evaluate(event, makeInsight())

    expect(alert).not.toBeNull()
    expect(alert!.type).toBe(ExecutiveInsightAlertType.REOPENED)
    expect(alert!.insightKey).toBe(KEY)
  })

  it("returns RESOLVED alert for RESOLVED event", () => {
    const engine = new ExecutiveInsightAlertEngine()
    const event = makeEvent(ExecutiveInsightEventType.RESOLVED)
    const alert = engine.evaluate(event, makeInsight())

    expect(alert).not.toBeNull()
    expect(alert!.type).toBe(ExecutiveInsightAlertType.RESOLVED)
  })

  it("returns ARCHIVED alert for ARCHIVED event", () => {
    const engine = new ExecutiveInsightAlertEngine()
    const event = makeEvent(ExecutiveInsightEventType.ARCHIVED)
    const alert = engine.evaluate(event, makeInsight())

    expect(alert).not.toBeNull()
    expect(alert!.type).toBe(ExecutiveInsightAlertType.ARCHIVED)
  })

  it("returns null for CREATED event", () => {
    const engine = new ExecutiveInsightAlertEngine()
    const event = makeEvent(ExecutiveInsightEventType.CREATED)
    const alert = engine.evaluate(event, makeInsight())

    expect(alert).toBeNull()
  })

  it("returns null for UPDATED event", () => {
    const engine = new ExecutiveInsightAlertEngine()
    const event = makeEvent(ExecutiveInsightEventType.UPDATED)
    const alert = engine.evaluate(event, makeInsight())

    expect(alert).toBeNull()
  })

  it("returns null when insight is null for ACTIVATED (no context to evaluate)", () => {
    const engine = new ExecutiveInsightAlertEngine()
    const event = makeEvent(ExecutiveInsightEventType.ACTIVATED)
    const alert = engine.evaluate(event, null)

    expect(alert).toBeNull()
  })

  it("alert carries severity from insight", () => {
    const engine = new ExecutiveInsightAlertEngine()
    const event = makeEvent(ExecutiveInsightEventType.REOPENED)
    const insight = makeInsight({ severity: "CRITICAL" as const })
    const alert = engine.evaluate(event, insight)

    expect(alert!.severity).toBe("CRITICAL")
  })

  it("alert carries deterministic IDs", () => {
    const engine = new ExecutiveInsightAlertEngine()
    const event = makeEvent(ExecutiveInsightEventType.ARCHIVED, { id: "custom-id" })
    const alert = engine.evaluate(event, makeInsight())

    expect(alert!.id).toBe("alert:custom-id")
  })

  it("evaluateAll processes multiple events", async () => {
    const engine = new ExecutiveInsightAlertEngine()
    const events = [
      makeEvent(ExecutiveInsightEventType.REOPENED),
      makeEvent(ExecutiveInsightEventType.CREATED, { insightKey: "other:key" as InsightKey }),
    ]
    const alerts = await engine.evaluateAll(events, async () => makeInsight())

    expect(alerts).toHaveLength(1)
    expect(alerts[0].type).toBe(ExecutiveInsightAlertType.REOPENED)
  })

  it("evaluateAll returns alerts in deterministic order", async () => {
    const engine = new ExecutiveInsightAlertEngine()
    const events = [
      makeEvent(ExecutiveInsightEventType.RESOLVED),
      makeEvent(ExecutiveInsightEventType.REOPENED),
    ]
    const alerts = await engine.evaluateAll(events, async () => makeInsight())

    expect(alerts).toHaveLength(2)
    expect(alerts[0].type).toBe(ExecutiveInsightAlertType.RESOLVED)
    expect(alerts[1].type).toBe(ExecutiveInsightAlertType.REOPENED)
  })
})
