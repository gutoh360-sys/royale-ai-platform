import { describe, it, expect, beforeEach } from "vitest"
import { InMemoryExecutiveInsightTimeline } from "./in-memory-executive-insight-timeline"
import { ExecutiveInsightTimelineQueries } from "@/features/executive-insights/intelligence"
import { ExecutiveInsightEventType } from "@/features/executive-insights"
import type { ExecutiveInsightDomainEvent, InsightKey } from "@/features/executive-insights/domain"

const KEY = "inventory:insight:teste" as InsightKey

function makeEvent(
  type: ExecutiveInsightEventType,
  version: number,
  overrides: Partial<ExecutiveInsightDomainEvent> = {},
): ExecutiveInsightDomainEvent {
  return {
    id: `${KEY}:${type}:${version}`,
    insightKey: KEY,
    type,
    timestamp: new Date(`2026-07-2${version}`),
    sourceRunId: "run-001",
    version,
    ...overrides,
  }
}

describe("ExecutiveInsightTimelineQueries", () => {
  let timeline: InMemoryExecutiveInsightTimeline
  let queries: ExecutiveInsightTimelineQueries

  beforeEach(() => {
    timeline = new InMemoryExecutiveInsightTimeline()
    queries = new ExecutiveInsightTimelineQueries(timeline)
  })

  it("getFullHistory returns all events for a key in order", async () => {
    await timeline.append(makeEvent(ExecutiveInsightEventType.CREATED, 1))
    await timeline.append(makeEvent(ExecutiveInsightEventType.ACTIVATED, 2))
    await timeline.append(makeEvent(ExecutiveInsightEventType.UPDATED, 3))

    const history = await queries.getFullHistory(KEY)
    expect(history).toHaveLength(3)
    expect(history[0].type).toBe(ExecutiveInsightEventType.CREATED)
    expect(history[1].type).toBe(ExecutiveInsightEventType.ACTIVATED)
    expect(history[2].type).toBe(ExecutiveInsightEventType.UPDATED)
  })

  it("findFirstEvent returns the first event for a key", async () => {
    await timeline.append(makeEvent(ExecutiveInsightEventType.CREATED, 1))
    await timeline.append(makeEvent(ExecutiveInsightEventType.ACTIVATED, 2))

    const first = await queries.findFirstEvent(KEY)
    expect(first).not.toBeNull()
    expect(first!.type).toBe(ExecutiveInsightEventType.CREATED)
    expect(first!.version).toBe(1)
  })

  it("findFirstEvent returns null for unknown key", async () => {
    const other = "other:insight:key" as InsightKey
    const first = await queries.findFirstEvent(other)
    expect(first).toBeNull()
  })

  it("findLastEvent returns the last event for a key", async () => {
    await timeline.append(makeEvent(ExecutiveInsightEventType.CREATED, 1))
    await timeline.append(makeEvent(ExecutiveInsightEventType.ACTIVATED, 2))

    const last = await queries.findLastEvent(KEY)
    expect(last).not.toBeNull()
    expect(last!.type).toBe(ExecutiveInsightEventType.ACTIVATED)
    expect(last!.version).toBe(2)
  })

  it("findLastEvent returns null for unknown key", async () => {
    const other = "other:insight:key" as InsightKey
    const last = await queries.findLastEvent(other)
    expect(last).toBeNull()
  })

  it("countByType returns correct count for each event type", async () => {
    await timeline.append(makeEvent(ExecutiveInsightEventType.CREATED, 1))
    await timeline.append(makeEvent(ExecutiveInsightEventType.ACTIVATED, 2))
    await timeline.append(makeEvent(ExecutiveInsightEventType.UPDATED, 3))
    await timeline.append(makeEvent(ExecutiveInsightEventType.ACTIVATED, 4))

    const activatedCount = await queries.countByType(KEY, ExecutiveInsightEventType.ACTIVATED)
    const updatedCount = await queries.countByType(KEY, ExecutiveInsightEventType.UPDATED)
    const resolvedCount = await queries.countByType(KEY, ExecutiveInsightEventType.RESOLVED)

    expect(activatedCount).toBe(2)
    expect(updatedCount).toBe(1)
    expect(resolvedCount).toBe(0)
  })

  it("returns empty history for unknown key", async () => {
    const other = "other:insight:key" as InsightKey
    const history = await queries.getFullHistory(other)
    expect(history).toHaveLength(0)
  })

  it("countByType returns 0 for unknown key", async () => {
    const other = "other:insight:key" as InsightKey
    const count = await queries.countByType(other, ExecutiveInsightEventType.CREATED)
    expect(count).toBe(0)
  })
})
