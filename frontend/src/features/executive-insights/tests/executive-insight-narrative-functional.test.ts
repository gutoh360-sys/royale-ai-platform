import { describe, it, expect } from "vitest"
import { ExecutiveNarrativeEngine } from "@/features/executive-insights/narrative"
import { ExecutiveNarrativeTemplateProvider } from "@/features/executive-insights/narrative"
import type { ExecutiveNarrativeInput, ExecutiveNarrativeOutput } from "@/features/executive-insights/narrative"
import type { InsightKey } from "@/features/executive-insights/domain"

const KEY = "inventory:insight:ruptura" as InsightKey

function makeMinimalInput(
  overrides: Partial<ExecutiveNarrativeInput> = {},
): ExecutiveNarrativeInput {
  return {
    insightKey: KEY,
    title: "Ruptura de Estoque",
    summary: "Estoque crítico no depósito SP",
    fact: "Nível de estoque abaixo do mínimo",
    context: "",
    impact: "",
    recommendation: "",
    module: "inventory",
    category: "INVENTORY" as const,
    severity: "CRITICAL" as const,
    status: "ACTIVE" as const,
    priority: 0,
    evidence: { source: "inventory" },
    relatedInsights: [],
    version: 1,
    firstDetectedAt: "2026-07-28T00:00:00.000Z",
    lastDetectedAt: "2026-07-30T00:00:00.000Z",
    occurrenceCount: 3,
    resolvedAt: null,
    archivedAt: null,
    lastEvaluationRun: "run-001",
    timelineEvents: [],
    firstEvent: null,
    lastEvent: null,
    eventCountByType: {},
    activeAlerts: [],
    sourceRunId: "run-001",
    ...overrides,
  }
}

describe("ExecutiveNarrativeTemplateProvider", () => {
  it("produces deterministic narrative", async () => {
    const provider = new ExecutiveNarrativeTemplateProvider()
    const input = makeMinimalInput()

    const output = await provider.generate(input)

    expect(output.summary).toContain("Ruptura de Estoque")
    expect(output.summary).toContain("inventory")
    expect(output.summary).toContain("active")
    expect(output.summary).toContain("critical")
    expect(output.summary).toContain("2026-07-28")
    expect(output.summary).toContain("3")
  })

  it("same input produces same textual output (except generatedAt)", async () => {
    const provider = new ExecutiveNarrativeTemplateProvider()
    const input = makeMinimalInput()

    const output1 = await provider.generate(input)
    const output2 = await provider.generate(input)

    expect(output1.summary).toBe(output2.summary)
    expect(output1.details).toBe(output2.details)
    expect(output1.referencedEvidence).toEqual(output2.referencedEvidence)
    expect(output1.warnings).toEqual(output2.warnings)
  })

  it("no implicit dates are created", async () => {
    const provider = new ExecutiveNarrativeTemplateProvider()
    const input = makeMinimalInput()

    const output = await provider.generate(input)

    const inputDates = [input.firstDetectedAt, input.lastDetectedAt]
    const datePattern = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g
    const matches = output.summary.match(datePattern)
    if (matches) {
      for (const match of matches) {
        expect(inputDates).toContain(match)
      }
    }
  })

  it("no recommendation appears in output", async () => {
    const provider = new ExecutiveNarrativeTemplateProvider()
    const input = makeMinimalInput({ recommendation: "" })

    const output = await provider.generate(input)

    expect(output.details).not.toContain("Recomendação")
    expect(output.summary).not.toMatch(/recomenda|sugerimos|aconselhável|deve ser/i)
  })

  it("no causality is invented", async () => {
    const provider = new ExecutiveNarrativeTemplateProvider()
    const input = makeMinimalInput()

    const output = await provider.generate(input)

    const causalityTerms = [
      "porque", "por que", "ocorreu", "devido", "causa",
      "therefore", "because", "caused", "led to", "resultou",
    ]
    for (const term of causalityTerms) {
      expect(output.summary.toLowerCase()).not.toContain(term)
      expect(output.details.toLowerCase()).not.toContain(term)
    }
  })

  it("no threshold is applied", async () => {
    const provider = new ExecutiveNarrativeTemplateProvider()
    const input = makeMinimalInput()

    const output = await provider.generate(input)

    expect(output.details).not.toMatch(/threshold|limiar|limite|acima de|abaixo de/i)
  })

  it("severity is preserved", async () => {
    const provider = new ExecutiveNarrativeTemplateProvider()
    const input = makeMinimalInput({ severity: "CRITICAL" as const })

    const output = await provider.generate(input)

    expect(output.summary).toContain("critical")
  })

  it("priority is preserved", async () => {
    const provider = new ExecutiveNarrativeTemplateProvider()
    const input = makeMinimalInput({ priority: 5 })

    const output = await provider.generate(input)

    expect(output.details).toContain("5")
  })

  it("status is preserved", async () => {
    const provider = new ExecutiveNarrativeTemplateProvider()
    const input = makeMinimalInput({ status: "RESOLVED" as const })

    const output = await provider.generate(input)

    expect(output.summary).toContain("resolved")
  })

  it("evidence references belong to input", async () => {
    const provider = new ExecutiveNarrativeTemplateProvider()
    const input = makeMinimalInput()

    const output = await provider.generate(input)

    for (const ref of output.referencedEvidence) {
      const inputRecord = input as Record<string, unknown>
      expect(inputRecord[ref.field]).toBeDefined()
    }
  })

  it("insight without optional data still generates minimal factual narrative", async () => {
    const provider = new ExecutiveNarrativeTemplateProvider()
    const input = makeMinimalInput({
      title: "",
      summary: "",
      fact: "",
      context: "",
      impact: "",
      recommendation: "",
    })

    const output = await provider.generate(input)

    expect(output.summary).toBeTruthy()
    expect(output.summary).toContain("inventory")
    expect(output.warnings.length).toBeGreaterThan(0)
  })

  it("insufficient data is signaled via warnings", async () => {
    const provider = new ExecutiveNarrativeTemplateProvider()
    const input = makeMinimalInput({ title: "", summary: "" })

    const output = await provider.generate(input)

    expect(output.warnings.length).toBeGreaterThan(0)
    expect(output.isComplete).toBe(false)
  })
})

describe("ExecutiveNarrativeEngine", () => {
  it("does not modify the input", async () => {
    const engine = new ExecutiveNarrativeEngine()
    const input = makeMinimalInput()
    const frozen = { ...input }

    await engine.generate(input)

    expect(input.insightKey).toBe(frozen.insightKey)
    expect(input.title).toBe(frozen.title)
    expect(input.severity).toBe(frozen.severity)
  })

  it("arrays remain immutable", async () => {
    const engine = new ExecutiveNarrativeEngine()
    const input = makeMinimalInput()

    await engine.generate(input)

    expect(() => {
      ;(input.timelineEvents as unknown[]).push("x" as never)
    }).toThrow()
  })

  it("invalid provider triggers fallback", async () => {
    const failingProvider = {
      generate: async () => { throw new Error("provider failed") },
    }
    const engine = new ExecutiveNarrativeEngine(failingProvider)
    const input = makeMinimalInput()

    const output = await engine.generate(input)

    expect(output).toBeDefined()
    expect(output.summary).toContain("Ruptura de Estoque")
    expect(output.warnings).toHaveLength(0)
  })

  it("empty provider output triggers fallback", async () => {
    const emptyProvider = {
      generate: async () => ({} as ExecutiveNarrativeOutput),
    }
    const engine = new ExecutiveNarrativeEngine(emptyProvider)
    const input = makeMinimalInput()

    const output = await engine.generate(input)

    expect(output).toBeDefined()
    expect(output.summary).toBeTruthy()
  })

  it("factuality guard catches evidence mismatch", async () => {
    const badProvider = {
      generate: async () => ({
        insightKey: KEY,
        summary: "fake summary",
        details: "",
        sourceRunId: "run-001",
        generatedAt: new Date().toISOString(),
        referencedEvidence: [{ field: "nonexistent", value: "x" }],
        warnings: [],
        isComplete: true,
      } as ExecutiveNarrativeOutput),
    }
    const engine = new ExecutiveNarrativeEngine(badProvider)
    const input = makeMinimalInput()

    const output = await engine.generate(input)

    expect(output.warnings.length).toBeGreaterThan(0)
  })

  it("does not access Repository", () => {
    const engine = new ExecutiveNarrativeEngine()
    const engineRecord = engine as unknown as Record<string, unknown>
    expect(engineRecord.repository).toBeUndefined()
    expect(engineRecord.timeline).toBeUndefined()
  })
})
