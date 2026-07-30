import { describe, it, expect } from "vitest"
import { DefaultExecutivePrioritizationService } from "@/features/executive-prioritization/services/executive-prioritization-service"
import { strategyCriticalFirst } from "@/features/executive-prioritization/strategies/critical-first"
import { strategyHighImpact } from "@/features/executive-prioritization/strategies/high-impact"
import { strategyQuickWins } from "@/features/executive-prioritization/strategies/quick-wins"
import { strategyDependency } from "@/features/executive-prioritization/strategies/dependency"
import { mockInsights, MOCK_COMPLEXITY, MOCK_BLOCKED_BY, MOCK_RELATED } from "@/features/executive-prioritization/mocks"
import { WHY_NOW_TEMPLATES } from "@/features/executive-prioritization/constants"
import type { ExecutiveInsight } from "@/features/executive-intelligence/types"

function insight(id: string, overrides?: Partial<ExecutiveInsight>): ExecutiveInsight {
  return {
    id, title: "Test", description: "Desc", category: "inventory",
    severity: "medium", priority: 50, affectedDomains: [], recommendedAction: "Avaliar situação",
    estimatedImpact: "medium", confidence: 0.7, reasons: [""], createdAt: "",
    ...overrides,
  }
}

describe("Strategy — Critical First", () => {
  it("gives higher score to critical severity", () => {
    const items = [insight("a", { severity: "info" }), insight("b", { severity: "critical" })]
    const scores = strategyCriticalFirst(items)
    expect(scores.get("b")).toBeGreaterThan(scores.get("a")!)
  })
})

describe("Strategy — High Impact", () => {
  it("gives higher score to high impact", () => {
    const items = [insight("a", { estimatedImpact: "low" }), insight("b", { estimatedImpact: "high" })]
    const scores = strategyHighImpact(items)
    expect(scores.get("b")).toBeGreaterThan(scores.get("a")!)
  })
})

describe("Strategy — Quick Wins", () => {
  it("penalizes complex actions", () => {
    const easy = insight("a", { recommendedAction: "Priorizar a compra de produtos" })
    const complex = insight("b", { recommendedAction: "Implementar novo sistema" })
    const scores = strategyQuickWins([easy, complex])
    expect(scores.get("a")).toBeLessThan(scores.get("b")!)
  })
})

describe("Strategy — Dependency", () => {
  it("gives bonus to unblocked items", () => {
    const items = [insight("a"), insight("b")]
    const blockedBy = { a: ["Financeiro"], b: [] }
    const scores = strategyDependency(items, blockedBy)
    expect(scores.get("b")).toBeGreaterThan(scores.get("a")!)
  })
})

describe("Ranking", () => {
  it("critical severity ranks higher than info", () => {
    const service = new DefaultExecutivePrioritizationService()
    const items = [insight("a", { severity: "info", priority: 40 }), insight("b", { severity: "critical", priority: 50 })]
    const result = service.prioritize(items)
    expect(result[0].id).toBe("b")
    expect(result[0].rank).toBe(1)
  })

  it("higher impact ranks higher within same severity", () => {
    const service = new DefaultExecutivePrioritizationService()
    const items = [
      insight("a", { severity: "high", priority: 70, estimatedImpact: "low" }),
      insight("b", { severity: "high", priority: 65, estimatedImpact: "high" }),
    ]
    const result = service.prioritize(items)
    expect(result[0].id).toBe("b")
  })

  it("quick wins preferred for similar scores", () => {
    const service = new DefaultExecutivePrioritizationService()
    const items = [
      insight("a", { severity: "high", priority: 70, estimatedImpact: "medium", recommendedAction: "Implementar sistema complexo" }),
      insight("b", { severity: "high", priority: 68, estimatedImpact: "medium", recommendedAction: "Priorizar a compra de estoque" }),
    ]
    const complexities = { a: "complex", b: "easy" } as const
    const result = service.prioritize(items, { complexityOverrides: complexities })
    expect(result[0].id).toBe("b")
  })
})

describe("Why Now", () => {
  it("immediate urgency returns immediate template", () => {
    const service = new DefaultExecutivePrioritizationService()
    const items = [insight("a", { severity: "critical", priority: 100, estimatedImpact: "high" })]
    const result = service.prioritize(items)
    expect(result[0].whyNow).toBe(WHY_NOW_TEMPLATES.immediate)
  })
})

describe("Related Insights", () => {
  it("groups related insights", () => {
    const service = new DefaultExecutivePrioritizationService()
    const result = service.prioritize(mockInsights, {
      complexityOverrides: MOCK_COMPLEXITY,
      blockedBy: MOCK_BLOCKED_BY,
      relatedInsights: MOCK_RELATED,
    })
    const urgent = result.find((p) => p.id === "urgent-replenishment-needed")
    expect(urgent?.relatedInsights).toContain("marketplace-growth-stock-pressure")
  })
})

describe("Complete Engine", () => {
  it("returns all priorities sorted by rank", () => {
    const service = new DefaultExecutivePrioritizationService()
    const result = service.prioritize(mockInsights, {
      complexityOverrides: MOCK_COMPLEXITY,
      blockedBy: MOCK_BLOCKED_BY,
      relatedInsights: MOCK_RELATED,
    })
    expect(result.length).toBe(mockInsights.length)
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].rank).toBeLessThan(result[i].rank)
    }
  })

  it("all priorities have required fields", () => {
    const service = new DefaultExecutivePrioritizationService()
    const result = service.prioritize(mockInsights)
    for (const p of result) {
      expect(p.id).toBeTruthy()
      expect(typeof p.rank).toBe("number")
      expect(p.rank).toBeGreaterThanOrEqual(1)
      expect(p.title).toBeTruthy()
      expect(p.whyNow).toBeTruthy()
      expect(typeof p.priorityScore).toBe("number")
      expect(["immediate", "today", "this_week", "monitor"]).toContain(p.urgency)
      expect(Array.isArray(p.blockedBy)).toBe(true)
      expect(Array.isArray(p.relatedInsights)).toBe(true)
    }
  })
})
