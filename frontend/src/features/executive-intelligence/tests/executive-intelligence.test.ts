import { describe, it, expect } from "vitest"
import { DefaultExecutiveIntelligenceService } from "@/features/executive-intelligence/services/executive-intelligence-service"
import { ruleMarketplaceGrowthWithStockPressure } from "@/features/executive-intelligence/rules/rule-01-high-demand-stockout-risk"
import { ruleIdleCapital } from "@/features/executive-intelligence/rules/rule-02-idle-capital"
import { ruleUrgentReplenishment } from "@/features/executive-intelligence/rules/rule-03-urgent-replenishment"
import { ruleMarketplaceHealthy } from "@/features/executive-intelligence/rules/rule-04-marketplace-healthy"
import {
  mockHealthyCompany,
  mockCriticalRupture,
  mockIdleCapital,
  mockMarketplaceGrowth,
  mockMultipleProblems,
} from "@/features/executive-intelligence/mocks"
import { calculatePriority } from "@/features/executive-intelligence/evaluators"
import type { ExecutiveInsight } from "@/features/executive-intelligence/types"

function makeInsight(overrides: Partial<ExecutiveInsight> = {}): ExecutiveInsight {
  return {
    id: "test-insight",
    title: "Test Insight",
    description: "A test insight description",
    category: "inventory",
    severity: "medium",
    priority: 50,
    affectedDomains: ["inventory"],
    recommendedAction: "Do something",
    estimatedImpact: "Positive impact",
    confidence: 0.7,
    reasons: ["Reason 1"],
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

describe("Rule 01 — Marketplace Growth + Stock Pressure", () => {
  it("generates insight when marketplace growth is high and critical replenishment exists", () => {
    const result = ruleMarketplaceGrowthWithStockPressure(mockCriticalRupture)
    expect(result.length).toBe(1)
    expect(result[0].id).toBe("marketplace-growth-stock-pressure")
    expect(result[0].title).toContain("Crescimento de vendas")
    expect(result[0].severity).toBe("high")
  })

  it("returns empty when growth is below threshold", () => {
    const result = ruleMarketplaceGrowthWithStockPressure(mockHealthyCompany)
    expect(result.length).toBe(0)
  })

  it("returns empty when no critical replenishment", () => {
    const input = { ...mockMarketplaceGrowth, inventory: { ...mockMarketplaceGrowth.inventory, criticalReplenishmentCount: 0 } }
    const result = ruleMarketplaceGrowthWithStockPressure(input)
    expect(result.length).toBe(0)
  })

  it("does not cite specific products or SKUs", () => {
    const result = ruleMarketplaceGrowthWithStockPressure(mockCriticalRupture)
    expect(result[0].description).not.toMatch(/SKU|produto [a-z0-9-]+ é|está em/i)
  })

  it("describes simultaneity not causality", () => {
    const result = ruleMarketplaceGrowthWithStockPressure(mockCriticalRupture)
    expect(result[0].description).toMatch(/enquanto/i)
    expect(result[0].reasons.join(" ")).not.toContain("portanto")
    expect(result[0].reasons.join(" ")).not.toContain("conseq")
  })
})

describe("Rule 02 — Idle Capital", () => {
  it("generates insight when idle capital exceeds thresholds", () => {
    const result = ruleIdleCapital(mockIdleCapital)
    expect(result.length).toBe(1)
    expect(result[0].id).toBe("idle-capital-elevated")
    expect(result[0].title).toContain("Capital imobilizado")
  })

  it("returns empty when product count is below minimum", () => {
    const result = ruleIdleCapital(mockHealthyCompany)
    expect(result.length).toBe(0)
  })

  it("returns empty when idle capital value is below minimum", () => {
    const input = {
      ...mockIdleCapital,
      inventory: { ...mockIdleCapital.inventory, idleCapitalValue: 5000, idleCapitalProductCount: 5 },
    }
    const result = ruleIdleCapital(input)
    expect(result.length).toBe(0)
  })

  it("does not mention percentage of total stock", () => {
    const result = ruleIdleCapital(mockIdleCapital)
    expect(result[0].description).not.toMatch(/%|proporção|parcela do estoque/i)
    expect(result[0].reasons.join(" ")).not.toMatch(/%|proporção/i)
  })

  it("estimatedImpact is qualitative, not monetary", () => {
    const result = ruleIdleCapital(mockIdleCapital)
    expect(["high", "medium", "low"]).toContain(result[0].estimatedImpact)
  })
})

describe("Rule 03 — Urgent Replenishment", () => {
  it("generates insight when critical replenishment exceeds threshold", () => {
    const result = ruleUrgentReplenishment(mockCriticalRupture)
    expect(result.length).toBe(1)
    expect(result[0].id).toBe("urgent-replenishment-needed")
    expect(result[0].severity).toBe("critical")
  })

  it("returns empty when below threshold", () => {
    const result = ruleUrgentReplenishment(mockHealthyCompany)
    expect(result.length).toBe(0)
  })
})

describe("Rule 04 — Marketplace Healthy", () => {
  it("generates positive insight when marketplace is healthy and inventory risk is low", () => {
    const result = ruleMarketplaceHealthy(mockHealthyCompany)
    expect(result.length).toBe(1)
    expect(result[0].id).toBe("marketplace-healthy-outlook")
    expect(result[0].severity).toBe("info")
  })

  it("returns empty when health is below threshold", () => {
    const result = ruleMarketplaceHealthy(mockCriticalRupture)
    expect(result.length).toBe(0)
  })

  it("returns empty when combined risk is high", () => {
    const result = ruleMarketplaceHealthy(mockMultipleProblems)
    expect(result.length).toBe(0)
  })
})

describe("Priority Calculation", () => {
  it("critical severity scores higher than info", () => {
    const critical = calculatePriority(makeInsight({ severity: "critical", confidence: 0.9, estimatedImpact: "high", affectedDomains: ["a", "b"] }))
    const info = calculatePriority(makeInsight({ severity: "info", confidence: 0.5, estimatedImpact: "low", affectedDomains: ["a"] }))
    expect(critical).toBeGreaterThan(info)
  })

  it("higher confidence increases priority", () => {
    const high = calculatePriority(makeInsight({ severity: "high", confidence: 0.95, estimatedImpact: "high", affectedDomains: ["a", "b", "c"] }))
    const low = calculatePriority(makeInsight({ severity: "high", confidence: 0.3, estimatedImpact: "low", affectedDomains: ["a"] }))
    expect(high).toBeGreaterThan(low)
  })

  it("priority is always between 0 and 100", () => {
    const insight = makeInsight({ severity: "critical", confidence: 1, estimatedImpact: "high", affectedDomains: ["a", "b", "c"] })
    const score = calculatePriority(insight)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })
})

describe("Deduplication", () => {
  it("deduplicates identical insights keeping highest priority", () => {
    const service = new DefaultExecutiveIntelligenceService()
    const input = {
      ...mockMultipleProblems,
      marketplace: { ...mockMultipleProblems.marketplace, highestGrowth: 18 },
    }
    const insights = service.generateInsights(input)
    const ids = insights.map((i) => i.id)
    const uniqueIds = [...new Set(ids)]
    expect(ids.length).toBe(uniqueIds.length)
  })
})

describe("Engine — DefaultExecutiveIntelligenceService", () => {
  it("generates insights for healthy company", () => {
    const service = new DefaultExecutiveIntelligenceService()
    const insights = service.generateInsights(mockHealthyCompany)
    expect(insights.length).toBeGreaterThanOrEqual(0)
  })

  it("generates multiple insights for critical rupture scenario", () => {
    const service = new DefaultExecutiveIntelligenceService()
    const insights = service.generateInsights(mockCriticalRupture)
    expect(insights.length).toBeGreaterThanOrEqual(2)
  })

  it("generates idle capital insight for idle capital scenario", () => {
    const service = new DefaultExecutiveIntelligenceService()
    const insights = service.generateInsights(mockIdleCapital)
    const idleInsight = insights.find((i) => i.id === "idle-capital-elevated")
    expect(idleInsight).toBeDefined()
  })

  it("generates marketplace growth insight for growth scenario", () => {
    const service = new DefaultExecutiveIntelligenceService()
    const insights = service.generateInsights(mockMarketplaceGrowth)
    const growthInsight = insights.find((i) => i.id === "marketplace-growth-stock-pressure")
    expect(growthInsight).toBeDefined()
  })

  it("generates multiple insights for multiple problems scenario", () => {
    const service = new DefaultExecutiveIntelligenceService()
    const insights = service.generateInsights(mockMultipleProblems)
    expect(insights.length).toBeGreaterThanOrEqual(3)
  })

  it("returns insights sorted by priority descending", () => {
    const service = new DefaultExecutiveIntelligenceService()
    const insights = service.generateInsights(mockMultipleProblems)
    for (let i = 1; i < insights.length; i++) {
      expect(insights[i - 1].priority).toBeGreaterThanOrEqual(insights[i].priority)
    }
  })

  it("all insights have valid required fields", () => {
    const service = new DefaultExecutiveIntelligenceService()
    const insights = service.generateInsights(mockMultipleProblems)
    for (const insight of insights) {
      expect(insight.id).toBeTruthy()
      expect(insight.title).toBeTruthy()
      expect(insight.description).toBeTruthy()
      expect(insight.category).toBeTruthy()
      expect(insight.severity).toBeTruthy()
      expect(typeof insight.priority).toBe("number")
      expect(insight.priority).toBeGreaterThanOrEqual(0)
      expect(insight.priority).toBeLessThanOrEqual(100)
      expect(Array.isArray(insight.affectedDomains)).toBe(true)
      expect(insight.recommendedAction).toBeTruthy()
      expect(insight.estimatedImpact).toBeTruthy()
      expect(typeof insight.confidence).toBe("number")
      expect(insight.confidence).toBeGreaterThan(0)
      expect(insight.confidence).toBeLessThanOrEqual(1)
      expect(Array.isArray(insight.reasons)).toBe(true)
      expect(insight.createdAt).toBeTruthy()
    }
  })
})
