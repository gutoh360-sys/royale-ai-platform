import { describe, it, expect, beforeEach } from "vitest"
import { InMemoryExecutiveInsightRepository } from "./in-memory-executive-insight-repository"
import { InMemoryExecutiveInsightTimeline } from "./in-memory-executive-insight-timeline"
import { ExecutiveInsightLifecycleEngine } from "@/features/executive-insights/lifecycle"
import { ExecutiveInsightStatus } from "@/features/executive-insights/types"
import type { ExecutiveInsight, InsightKey } from "@/features/executive-insights/domain"
import type { LifecycleContext } from "@/features/executive-insights/lifecycle"

const KEY_1 = "inventory:insight:ruptura" as InsightKey
const KEY_2 = "financial:insight:lucro" as InsightKey
const KEY_3 = "marketplace:insight:crescimento" as InsightKey

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

describe("ExecutiveInsightLifecycleEngine", () => {
  let repo: InMemoryExecutiveInsightRepository
  let timeline: InMemoryExecutiveInsightTimeline
  let engine: ExecutiveInsightLifecycleEngine

  beforeEach(() => {
    repo = new InMemoryExecutiveInsightRepository()
    timeline = new InMemoryExecutiveInsightTimeline()
    engine = new ExecutiveInsightLifecycleEngine(repo, timeline)
  })

  describe("1. First appearance", () => {
    it("creates NEW insight with occurrenceCount = 1 and deterministic dates", async () => {
      const input = makeInsight(KEY_1)
      const result = await engine.reconcile([input], CTX_1)

      expect(result.created).toHaveLength(1)
      expect(result.activated).toHaveLength(0)
      expect(result.updated).toHaveLength(0)
      expect(result.resolved).toHaveLength(0)
      expect(result.unchanged).toHaveLength(0)
      expect(result.ignored).toHaveLength(0)

      const saved = result.created[0]
      expect(saved.status).toBe(ExecutiveInsightStatus.NEW)
      expect(saved.firstDetectedAt).toBe(REF_DATE_1)
      expect(saved.lastDetectedAt).toBe(REF_DATE_1)
      expect(saved.occurrenceCount).toBe(1)
      expect(saved.lastEvaluationRun).toBe("run-001")
      expect(saved.version).toBe(1)
      expect(saved.resolvedAt).toBeNull()
      expect(saved.archivedAt).toBeNull()
    })
  })

  describe("2. NEW re-detected → ACTIVE", () => {
    it("transitions NEW to ACTIVE, preserves firstDetectedAt, updates lastDetectedAt, increments occurrenceCount", async () => {
      await engine.reconcile([makeInsight(KEY_2)], CTX_1)

      const result = await engine.reconcile([makeInsight(KEY_2)], CTX_2)

      expect(result.created).toHaveLength(0)
      expect(result.activated).toHaveLength(1)
      expect(result.updated).toHaveLength(0)

      const activated = result.activated[0]
      expect(activated.status).toBe(ExecutiveInsightStatus.ACTIVE)
      expect(activated.firstDetectedAt).toBe(REF_DATE_1)
      expect(activated.lastDetectedAt).toBe(REF_DATE_2)
      expect(activated.occurrenceCount).toBe(2)
      expect(activated.lastEvaluationRun).toBe("run-002")
      expect(activated.version).toBe(2)
    })
  })

  describe("3. ACTIVE re-detected → ACTIVE", () => {
    it("keeps ACTIVE, increments occurrenceCount, updates lastDetectedAt", async () => {
      await engine.reconcile([makeInsight(KEY_2)], CTX_1)
      await engine.reconcile([makeInsight(KEY_2)], CTX_2)

      const result = await engine.reconcile([makeInsight(KEY_2)], CTX_3)

      expect(result.updated).toHaveLength(1)
      const updated = result.updated[0]
      expect(updated.status).toBe(ExecutiveInsightStatus.ACTIVE)
      expect(updated.firstDetectedAt).toBe(REF_DATE_1)
      expect(updated.lastDetectedAt).toBe(REF_DATE_3)
      expect(updated.occurrenceCount).toBe(3)
      expect(updated.lastEvaluationRun).toBe("run-003")
      expect(updated.version).toBe(3)
    })
  })

  describe("4. ACTIVE not detected → RESOLVED", () => {
    it("resolves ACTIVE insights not in current run", async () => {
      await engine.reconcile([makeInsight(KEY_1)], CTX_1)
      await engine.reconcile([makeInsight(KEY_1)], CTX_2)

      const result = await engine.reconcile([makeInsight(KEY_2)], CTX_3)

      expect(result.resolved).toHaveLength(1)
      const resolved = result.resolved[0]
      expect(resolved.key).toBe(KEY_1)
      expect(resolved.status).toBe(ExecutiveInsightStatus.RESOLVED)
      expect(resolved.resolvedAt).toBe(REF_DATE_3)
      expect(resolved.firstDetectedAt).toBe(REF_DATE_1)
      expect(resolved.lastDetectedAt).toBe(REF_DATE_2)
      expect(resolved.occurrenceCount).toBe(2)
      expect(resolved.version).toBe(3)
    })
  })

  describe("5. RESOLVED re-detected → ACTIVE", () => {
    it("reactivates RESOLVED insight, clears resolvedAt, increments occurrenceCount", async () => {
      await engine.reconcile([makeInsight(KEY_1)], CTX_1)
      await engine.reconcile([makeInsight(KEY_1)], CTX_2)

      await engine.reconcile([makeInsight(KEY_2)], CTX_3)
      const result = await engine.reconcile([makeInsight(KEY_1)], CTX_3)

      expect(result.activated).toHaveLength(1)
      const activated = result.activated[0]
      expect(activated.status).toBe(ExecutiveInsightStatus.ACTIVE)
      expect(activated.resolvedAt).toBeNull()
      expect(activated.occurrenceCount).toBe(3)
      expect(activated.firstDetectedAt).toBe(REF_DATE_1)
      expect(activated.lastDetectedAt).toBe(REF_DATE_3)
      expect(activated.version).toBe(4)
    })
  })

  describe("6. ARCHIVED stays unchanged", () => {
    it("does not affect archived insights", async () => {
      await engine.reconcile([makeInsight(KEY_1)], CTX_1)
      await engine.reconcile([makeInsight(KEY_1)], CTX_2)

      const active = await repo.findActive()
      await repo.archive(active[0].id)

      const result = await engine.reconcile([makeInsight(KEY_1)], CTX_3)

      expect(result.ignored).toHaveLength(1)
      expect(result.created).toHaveLength(0)
      expect(result.activated).toHaveLength(0)
      expect(result.updated).toHaveLength(0)
      expect(result.resolved).toHaveLength(0)

      const archived = await repo.findByKey(KEY_1)
      expect(archived?.status).toBe(ExecutiveInsightStatus.ARCHIVED)
    })
  })

  describe("7. Version semantics", () => {
    it("does not increment version for unchanged (ARCHIVED ignored)", async () => {
      await engine.reconcile([makeInsight(KEY_1)], CTX_1)
      await engine.reconcile([makeInsight(KEY_1)], CTX_2)

      const active = await repo.findActive()
      await repo.archive(active[0].id)

      await engine.reconcile([makeInsight(KEY_1)], CTX_3)
      const archived = await repo.findByKey(KEY_1)
      expect(archived?.version).toBe(2)
    })

    it("increments version on lifecycle transition", async () => {
      await engine.reconcile([makeInsight(KEY_1)], CTX_1)
      const afterCreate = await repo.findByKey(KEY_1)
      expect(afterCreate?.version).toBe(1)

      await engine.reconcile([makeInsight(KEY_1)], CTX_2)
      const afterActivate = await repo.findByKey(KEY_1)
      expect(afterActivate?.version).toBe(2)
    })
  })

  describe("8. Determinism", () => {
    it("same input + same repo state produces same result", async () => {
      const resultA = await engine.reconcile([makeInsight(KEY_1)], CTX_1)
      expect(resultA.created[0].occurrenceCount).toBe(1)
      expect(resultA.created[0].firstDetectedAt).toBe(REF_DATE_1)

      repo.clear()
      const resultB = await engine.reconcile([makeInsight(KEY_1)], CTX_1)
      expect(resultB.created[0].occurrenceCount).toBe(1)
      expect(resultB.created[0].firstDetectedAt).toBe(REF_DATE_1)
    })
  })

  describe("9. Imutability", () => {
    it("does not modify input array", async () => {
      const input = makeInsight(KEY_1)
      const original = { ...input }
      await engine.reconcile([input], CTX_1)
      expect(input.key).toBe(original.key)
      expect(input.status).toBe(original.status)
    })

    it("does not mutate existing entities in-place", async () => {
      await engine.reconcile([makeInsight(KEY_1)], CTX_1)
      const before = await repo.findByKey(KEY_1)
      const beforeStatus = before!.status

      await engine.reconcile([makeInsight(KEY_2)], CTX_2)
      const after = await repo.findByKey(KEY_1)
      expect(after!.status).toBe(beforeStatus)
    })
  })

  describe("10. Multiple insights", () => {
    it("processes multiple InsightKeys in the same run", async () => {
      const result = await engine.reconcile(
        [makeInsight(KEY_1), makeInsight(KEY_2)],
        CTX_1,
      )
      expect(result.created).toHaveLength(2)
    })

    it("does not mix identities", async () => {
      await engine.reconcile([makeInsight(KEY_1)], CTX_1)
      await engine.reconcile([makeInsight(KEY_1)], CTX_2)

      const result = await engine.reconcile(
        [makeInsight(KEY_2), makeInsight(KEY_3)],
        CTX_3,
      )
      expect(result.created).toHaveLength(2)
      expect(result.activated).toHaveLength(0)

      const missing = result.resolved.find((r) => r.key === KEY_1)
      expect(missing).toBeDefined()
      expect(missing!.status).toBe(ExecutiveInsightStatus.RESOLVED)
    })
  })

  describe("11. Repository", () => {
    it("all operations pass through the repository contract", async () => {
      await engine.reconcile([makeInsight(KEY_1)], CTX_1)
      expect(repo.count()).toBe(1)

      await engine.reconcile([makeInsight(KEY_1)], CTX_2)
      expect(repo.count()).toBe(1)

      await engine.reconcile([makeInsight(KEY_2)], CTX_3)
      expect(repo.count()).toBe(2)
    })
  })

  describe("12. SourceRunId", () => {
    it("lastEvaluationRun receives the correct sourceRunId", async () => {
      const result = await engine.reconcile([makeInsight(KEY_1)], CTX_1)
      expect(result.created[0].lastEvaluationRun).toBe("run-001")

      await engine.reconcile([makeInsight(KEY_1)], CTX_2)
      const saved = await repo.findByKey(KEY_1)
      expect(saved?.lastEvaluationRun).toBe("run-002")
    })
  })
})
