import { describe, it, expect } from "vitest"
import { DefaultPurchaseIntelligenceService } from "@/features/purchase-intelligence/services/purchase-intelligence-service"
import { buildMockAnalyses } from "@/features/purchase-intelligence/mocks"
import {
  calculateCoverageRisk,
  calculateLeadTimeRisk,
  calculateInvestment,
  calculateRevenueProtection,
  calculateMarginProtection,
  calculateSafeOrderDate,
  calculateRecommendedOrderDate,
} from "@/features/purchase-intelligence/calculators"
import { evaluateUrgency, evaluateRiskLevel, evaluatePriority } from "@/features/purchase-intelligence/evaluators"
import type { InventoryAnalysis } from "@/features/inventory-intelligence/types"

function makeAnalysis(overrides: Partial<InventoryAnalysis> & { productId: string }): InventoryAnalysis {
  return {
    sku: "TEST", productName: "Test", availableStock: 100, stockCoverageDays: 30,
    stockTurnover: null, projectedStockAfterLeadTime: 80, suggestedPurchaseQuantity: 20,
    grossMargin: 40, grossMarginPercentage: 50, daysSinceLastSale: 1,
    abcClass: "A", stockStatus: "healthy", replenishmentScore: 50,
    replenishmentPriority: "medium", reasons: [], cost: 50,
    ...overrides,
  }
}

describe("Calculators", () => {
  it("calculateCoverageRisk returns 1 for null coverage", () => {
    expect(calculateCoverageRisk(null, 7)).toBe(1)
  })

  it("calculateCoverageRisk returns 0.8 when coverage <= lead time", () => {
    expect(calculateCoverageRisk(5, 7)).toBe(0.8)
  })

  it("calculateCoverageRisk returns 0.2 when coverage is ample", () => {
    expect(calculateCoverageRisk(30, 7)).toBe(0.2)
  })

  it("calculateLeadTimeRisk returns 0.9 for long lead time", () => {
    expect(calculateLeadTimeRisk(25)).toBe(0.9)
  })

  it("calculateLeadTimeRisk returns 0.1 for short lead time", () => {
    expect(calculateLeadTimeRisk(3)).toBe(0.1)
  })

  it("calculateInvestment multiplies quantity by cost", () => {
    expect(calculateInvestment(10, 50)).toBe(500)
  })

  it("calculateInvestment clamps negative cost to 0", () => {
    expect(calculateInvestment(10, -5)).toBe(0)
  })

  it("calculateRevenueProtection returns 0 when no demand", () => {
    expect(calculateRevenueProtection(10, 100, 0)).toBe(0)
  })

  it("calculateRevenueProtection estimates lost revenue", () => {
    const result = calculateRevenueProtection(10, 100, 2)
    expect(result).toBeGreaterThan(0)
  })

  it("calculateMarginProtection returns 0 when no demand", () => {
    expect(calculateMarginProtection(10, 100, 50, 0)).toBe(0)
  })

  it("calculateMarginProtection returns 0 when margin is negative", () => {
    expect(calculateMarginProtection(10, 30, 50, 2)).toBe(0)
  })

  it("safe order date is now when stockout imminent", () => {
    const date = calculateSafeOrderDate(7, 0)
    expect(date).toBeTruthy()
  })

  it("recommended order date accounts for lead time", () => {
    const date = calculateRecommendedOrderDate(7, 20)
    expect(date).toBeTruthy()
  })
})

describe("Evaluators", () => {
  it("evaluateUrgency returns immediate when coverage <= lead time", () => {
    expect(evaluateUrgency(5, 7, 10, 50)).toBe("immediate")
  })

  it("evaluateUrgency returns today when near limit", () => {
    expect(evaluateUrgency(9, 7, 10, 50)).toBe("today")
  })

  it("evaluateRiskLevel returns critical when out of stock", () => {
    expect(evaluateRiskLevel(0, 7, "out_of_stock")).toBe("critical")
  })

  it("evaluateRiskLevel returns critical when coverage <= lead time", () => {
    expect(evaluateRiskLevel(5, 7, "healthy")).toBe("critical")
  })

  it("evaluatePriority is higher for high margin products", () => {
    const high = evaluatePriority(45, 5, "critical")
    const low = evaluatePriority(10, 1, "low")
    expect(high).toBeGreaterThan(low)
  })
})

describe("Engine", () => {
  it("returns recommendations from mock analyses", () => {
    const { analyses, productData } = buildMockAnalyses()
    const service = new DefaultPurchaseIntelligenceService()
    const result = service.analyze(analyses, productData)
    expect(result.recommendations.length).toBeGreaterThan(0)
    expect(result.summary.totalProducts).toBe(result.recommendations.length)
  })

  it("filters out inactive and zero-suggested products", () => {
    const analyses = [
      makeAnalysis({ productId: "a", stockStatus: "inactive", suggestedPurchaseQuantity: 0 }),
      makeAnalysis({ productId: "b", stockStatus: "healthy", suggestedPurchaseQuantity: 10 }),
    ]
    const productData = { b: { averageDailySales: 3, leadTimeDays: 7, salePrice: 100, cost: 50 } }
    const service = new DefaultPurchaseIntelligenceService()
    const result = service.analyze(analyses, productData)
    expect(result.recommendations.length).toBe(1)
    expect(result.recommendations[0].id).toBe("purchase-b")
  })

  it("sorts by priority descending", () => {
    const analyses = [
      makeAnalysis({ productId: "a", suggestedPurchaseQuantity: 5, grossMarginPercentage: 10, stockCoverageDays: 30, stockStatus: "healthy" }),
      makeAnalysis({ productId: "b", suggestedPurchaseQuantity: 5, grossMarginPercentage: 50, stockCoverageDays: 2, stockStatus: "out_of_stock" }),
    ]
    const productData = {
      a: { averageDailySales: 1, leadTimeDays: 5, salePrice: 100, cost: 50 },
      b: { averageDailySales: 5, leadTimeDays: 7, salePrice: 100, cost: 50 },
    }
    const service = new DefaultPurchaseIntelligenceService()
    const result = service.analyze(analyses, productData)
    expect(result.recommendations[0].priority).toBeGreaterThanOrEqual(result.recommendations[1].priority)
  })
})

describe("Summary", () => {
  it("aggregates financial metrics correctly", () => {
    const analyses = [
      makeAnalysis({ productId: "a", suggestedPurchaseQuantity: 10, cost: 50, stockCoverageDays: 5, stockStatus: "out_of_stock" }),
      makeAnalysis({ productId: "b", suggestedPurchaseQuantity: 5, cost: 20, stockCoverageDays: 20, stockStatus: "healthy" }),
    ]
    const productData = {
      a: { averageDailySales: 2, leadTimeDays: 7, salePrice: 100, cost: 50 },
      b: { averageDailySales: 1, leadTimeDays: 7, salePrice: 50, cost: 20 },
    }
    const service = new DefaultPurchaseIntelligenceService()
    const result = service.analyze(analyses, productData)
    expect(result.summary.recommendedInvestment).toBe((10 * 50) + (5 * 20))
    expect(result.summary.criticalProducts).toBeGreaterThan(0)
  })

  it("determines highest risk correctly", () => {
    const analyses = [
      makeAnalysis({ productId: "a", stockCoverageDays: 0, stockStatus: "out_of_stock", suggestedPurchaseQuantity: 10 }),
      makeAnalysis({ productId: "b", stockCoverageDays: 30, stockStatus: "healthy", suggestedPurchaseQuantity: 5, grossMarginPercentage: 10 }),
    ]
    const productData = {
      a: { averageDailySales: 2, leadTimeDays: 7, salePrice: 100, cost: 40 },
      b: { averageDailySales: 0.5, leadTimeDays: 7, salePrice: 100, cost: 50 },
    }
    const service = new DefaultPurchaseIntelligenceService()
    const result = service.analyze(analyses, productData)
    expect(result.summary.highestRisk).toBe("critical")
  })

  it("recommendations have all required fields", () => {
    const { analyses, productData } = buildMockAnalyses()
    const service = new DefaultPurchaseIntelligenceService()
    const result = service.analyze(analyses, productData)
    for (const rec of result.recommendations) {
      expect(rec.id).toBeTruthy()
      expect(rec.sku).toBeTruthy()
      expect(typeof rec.recommendedQuantity).toBe("number")
      expect(typeof rec.estimatedInvestment).toBe("number")
      expect(["immediate", "today", "this_week", "planned"]).toContain(rec.urgency)
      expect(["low", "medium", "high", "critical"]).toContain(rec.riskLevel)
      expect(typeof rec.priority).toBe("number")
      expect(rec.recommendedOrderDate).toBeTruthy()
      expect(rec.latestSafeOrderDate).toBeTruthy()
      expect(rec.reason).toBeTruthy()
    }
  })
})
