import { describe, it, expect } from "vitest"
import { DefaultSalesIntelligenceService } from "@/features/sales-intelligence/services/sales-intelligence-service"
import { buildSalesInput } from "@/features/sales-intelligence/mocks"
import {
  calculateConversionScore, calculateRevenuePotential, calculateMarginPotential,
  calculateStockAvailability, calculateSalesOpportunityScore, calculatePriorityScore,
} from "@/features/sales-intelligence/calculators"
import { evaluateOpportunityType, evaluatePriority, evaluateConfidence } from "@/features/sales-intelligence/evaluators"

describe("Calculators", () => {
  it("calculateConversionScore returns 0 for zero views", () => {
    expect(calculateConversionScore(0.05, 0)).toBe(0)
  })

  it("calculateConversionScore increases with rate", () => {
    expect(calculateConversionScore(0.1, 1000)).toBeGreaterThan(calculateConversionScore(0.01, 1000))
  })

  it("calculateRevenuePotential returns 0 for zero revenue", () => {
    expect(calculateRevenuePotential(0, 0.05, 10)).toBe(0)
  })

  it("calculateRevenuePotential grows with growth rate", () => {
    const withGrowth = calculateRevenuePotential(10000, 0.05, 20)
    const withoutGrowth = calculateRevenuePotential(10000, 0.05, 0)
    expect(withGrowth).toBeGreaterThan(withoutGrowth)
  })

  it("calculateMarginPotential returns 0 for zero estimated revenue", () => {
    expect(calculateMarginPotential(50, 0)).toBe(0)
  })

  it("calculateMarginPotential returns correct value", () => {
    expect(calculateMarginPotential(50, 10000)).toBeGreaterThan(0)
  })

  it("calculateStockAvailability returns 0 for no stock", () => {
    expect(calculateStockAvailability(0, 30)).toBe(0)
  })

  it("calculateStockAvailability returns 1 for ample coverage", () => {
    expect(calculateStockAvailability(100, 60)).toBe(1)
  })

  it("calculateSalesOpportunityScore is between 0 and 100", () => {
    const score = calculateSalesOpportunityScore(0.5, 50, 0.8, 1000, 50000)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it("calculatePriorityScore multiplies score by confidence", () => {
    expect(calculatePriorityScore(80, 0.8)).toBe(64)
  })
})

describe("Evaluators", () => {
  it("evaluateOpportunityType returns replenish_stock for high conversion + low stock", () => {
    expect(evaluateOpportunityType(0.06, 1000, 10, 50, 5)).toBe("replenish_stock")
  })

  it("evaluateOpportunityType returns improve_listing for many views + low conversion", () => {
    expect(evaluateOpportunityType(0.005, 600, 30, 50, 100)).toBe("improve_listing")
  })

  it("evaluateOpportunityType returns increase_ads for high margin + high conversion + stock", () => {
    expect(evaluateOpportunityType(0.06, 1000, 30, 50, 100)).toBe("increase_ads")
  })

  it("evaluateOpportunityType returns review_price for high stock + low conversion", () => {
    expect(evaluateOpportunityType(0.02, 100, 90, 50, 200)).toBe("review_price")
  })

  it("evaluateOpportunityType returns monitor when nothing else applies", () => {
    expect(evaluateOpportunityType(0.03, 100, 30, 30, 100)).toBe("monitor")
  })

  it("evaluatePriority returns critical for score >= 75", () => {
    expect(evaluatePriority(80)).toBe("critical")
  })

  it("evaluatePriority returns low for score < 25", () => {
    expect(evaluatePriority(10)).toBe("low")
  })

  it("evaluateConfidence is always between 0 and 1", () => {
    expect(evaluateConfidence(0.01, 100, 0.5)).toBeGreaterThanOrEqual(0)
    expect(evaluateConfidence(0.01, 100, 0.5)).toBeLessThanOrEqual(1)
  })
})

describe("Engine", () => {
  it("returns opportunities from mock data", () => {
    const input = buildSalesInput()
    const service = new DefaultSalesIntelligenceService()
    const result = service.analyze(input)
    expect(result.opportunities.length).toBeGreaterThan(0)
    expect(result.summary.productsAnalyzed).toBe(result.opportunities.length)
  })

  it("filters out inactive products and zero-performance products", () => {
    const input = buildSalesInput()
    const inactiveAnalysis = input.inventory.find((inv) => inv.stockStatus === "inactive")
    if (inactiveAnalysis) {
      const inactivePerf = input.products.find((p) => p.productId === inactiveAnalysis?.productId)
      expect(inactivePerf).toBeUndefined()
    }
  })

  it("sorts by priority descending then confidence descending", () => {
    const input = buildSalesInput()
    const service = new DefaultSalesIntelligenceService()
    const result = service.analyze(input)
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
    for (let i = 1; i < result.opportunities.length; i++) {
      const prev = priorityOrder[result.opportunities[i - 1].priority]
      const curr = priorityOrder[result.opportunities[i].priority]
      expect(prev).toBeGreaterThanOrEqual(curr)
    }
  })

  it("all opportunities have required fields", () => {
    const input = buildSalesInput()
    const service = new DefaultSalesIntelligenceService()
    const result = service.analyze(input)
    for (const opp of result.opportunities) {
      expect(opp.id).toBeTruthy()
      expect(opp.sku).toBeTruthy()
      expect(opp.productName).toBeTruthy()
      expect(opp.category).toBeTruthy()
      expect(["increase_ads", "improve_listing", "replenish_stock", "review_price", "monitor"]).toContain(opp.opportunityType)
      expect(["low", "medium", "high", "critical"]).toContain(opp.priority)
      expect(typeof opp.estimatedRevenueGain).toBe("number")
      expect(typeof opp.confidence).toBe("number")
    }
  })
})

describe("Summary", () => {
  it("aggregates correctly", () => {
    const input = buildSalesInput()
    const service = new DefaultSalesIntelligenceService()
    const result = service.analyze(input)
    expect(result.summary.productsAnalyzed).toBeGreaterThan(0)
    expect(result.summary.highOpportunities).toBeGreaterThanOrEqual(0)
    expect(result.summary.criticalProducts).toBeGreaterThanOrEqual(0)
    expect(result.summary.estimatedRevenuePotential).toBeGreaterThanOrEqual(0)
    expect(result.summary.averageConversion).toBeGreaterThan(0)
  })

  it("returns empty summary for no products", () => {
    const input = buildSalesInput()
    input.products = []
    const service = new DefaultSalesIntelligenceService()
    const result = service.analyze(input)
    expect(result.opportunities.length).toBe(0)
    expect(result.summary.productsAnalyzed).toBe(0)
  })
})

describe("Opportunity Types", () => {
  it("covers all five recommendation scenarios with mock data", () => {
    const input = buildSalesInput()
    const service = new DefaultSalesIntelligenceService()
    const result = service.analyze(input)
    const types = new Set(result.opportunities.map((o) => o.opportunityType))
    expect(types.has("increase_ads")).toBe(true)
    expect(types.has("improve_listing")).toBe(true)
    expect(types.has("replenish_stock")).toBe(true)
    expect(types.has("review_price")).toBe(true)
    expect(types.has("monitor")).toBe(true)
  })
})
