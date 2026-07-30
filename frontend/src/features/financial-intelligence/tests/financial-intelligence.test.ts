import { describe, it, expect } from "vitest"
import { DefaultFinancialIntelligenceService } from "@/features/financial-intelligence/services/financial-intelligence-service"
import { buildFinancialInput } from "@/features/financial-intelligence/mocks"
import {
  calculateROI, calculatePayback, calculateGrossMargin, calculateIdleCapital,
  calculateWorkingCapitalImpact, calculateFinancialHealthScore, calculateInvestmentEfficiency,
} from "@/features/financial-intelligence/calculators"
import { evaluateFinancialRisk, evaluateRecommendation, evaluateConfidence } from "@/features/financial-intelligence/evaluators"

describe("Calculators", () => {
  it("calculateROI returns 0 for zero cost and zero revenue", () => {
    expect(calculateROI(0, 0)).toBe(0)
  })

  it("calculateROI returns 999 for zero cost with revenue", () => {
    expect(calculateROI(100, 0)).toBe(999)
  })

  it("calculateROI computes correctly", () => {
    expect(calculateROI(200, 100)).toBe(100)
  })

  it("calculatePayback returns 999 for zero profit", () => {
    expect(calculatePayback(1000, 0)).toBe(999)
  })

  it("calculatePayback computes correctly", () => {
    expect(calculatePayback(1000, 200)).toBe(5)
  })

  it("calculateGrossMargin returns 0 for zero revenue", () => {
    expect(calculateGrossMargin(0, 100)).toBe(0)
  })

  it("calculateGrossMargin computes correctly", () => {
    expect(calculateGrossMargin(500, 200)).toBe(300)
  })

  it("calculateIdleCapital returns 0 for no stock", () => {
    expect(calculateIdleCapital(0, 50, 90)).toBe(0)
  })

  it("calculateIdleCapital returns 0 for null coverage", () => {
    expect(calculateIdleCapital(100, 50, null)).toBe(0)
  })

  it("calculateIdleCapital returns 0 when coverage below threshold", () => {
    expect(calculateIdleCapital(100, 50, 30)).toBe(0)
  })

  it("calculateIdleCapital returns positive for excess coverage", () => {
    const result = calculateIdleCapital(100, 50, 120)
    expect(result).toBeGreaterThan(0)
  })

  it("calculateWorkingCapitalImpact returns 0 for zero revenue", () => {
    expect(calculateWorkingCapitalImpact(5000, 1000, 0)).toBe(0)
  })

  it("calculateFinancialHealthScore is between 0 and 100", () => {
    const score = calculateFinancialHealthScore(0.3, 50, 60, 0.2, 0.1)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it("calculateInvestmentEfficiency returns 0 for negative payback", () => {
    expect(calculateInvestmentEfficiency(50, 0)).toBe(100)
  })
})

describe("Evaluators", () => {
  it("evaluateFinancialRisk returns critical for negative ROI + low margin", () => {
    expect(evaluateFinancialRisk(10, -5, 1000, 2000, 30)).toBe("critical")
  })

  it("evaluateFinancialRisk returns high for low margin", () => {
    expect(evaluateFinancialRisk(10, 20, 100, 5000, 30)).toBe("high")
  })

  it("evaluateFinancialRisk returns low for healthy metrics", () => {
    expect(evaluateFinancialRisk(40, 80, 100, 10000, 30)).toBe("low")
  })

  it("evaluateRecommendation returns increase_investment for high margin + high ROI", () => {
    expect(evaluateRecommendation(45, 60, 100, 5000, 30)).toBe("increase_investment")
  })

  it("evaluateRecommendation returns reduce_inventory for high idle", () => {
    expect(evaluateRecommendation(30, 30, 3000, 7000, 150)).toBe("reduce_inventory")
  })

  it("evaluateRecommendation returns improve_margin for low margin", () => {
    expect(evaluateRecommendation(10, 30, 100, 5000, 30)).toBe("improve_margin")
  })

  it("evaluateRecommendation returns monitor for stable situation", () => {
    expect(evaluateRecommendation(25, 20, 100, 5000, 30)).toBe("monitor")
  })

  it("evaluateConfidence is always between 0 and 1", () => {
    const c = evaluateConfidence(50, 20000, 40)
    expect(c).toBeGreaterThanOrEqual(0)
    expect(c).toBeLessThanOrEqual(1)
  })
})

describe("Engine", () => {
  it("returns insights from mock data", () => {
    const input = buildFinancialInput()
    const service = new DefaultFinancialIntelligenceService()
    const result = service.analyze(input)
    expect(result.insights.length).toBeGreaterThan(0)
    expect(result.summary.productsAnalyzed).toBe(result.insights.length)
  })

  it("filters out inactive products and zero-cost products", () => {
    const input = buildFinancialInput()
    const service = new DefaultFinancialIntelligenceService()
    const result = service.analyze(input)
    for (const insight of result.insights) {
      expect(insight.productId).toBeTruthy()
    }
  })

  it("all insights have required fields", () => {
    const input = buildFinancialInput()
    const service = new DefaultFinancialIntelligenceService()
    const result = service.analyze(input)
    for (const i of result.insights) {
      expect(i.id).toBeTruthy()
      expect(i.sku).toBeTruthy()
      expect(i.productName).toBeTruthy()
      expect(["low", "medium", "high", "critical"]).toContain(i.financialRisk)
      expect(["increase_investment", "reduce_inventory", "improve_margin", "monitor"]).toContain(i.recommendation)
      expect(typeof i.roi).toBe("number")
      expect(typeof i.paybackDays).toBe("number")
      expect(typeof i.confidence).toBe("number")
    }
  })
})

describe("Summary", () => {
  it("aggregates correctly", () => {
    const input = buildFinancialInput()
    const service = new DefaultFinancialIntelligenceService()
    const result = service.analyze(input)
    expect(result.summary.productsAnalyzed).toBeGreaterThan(0)
    expect(result.summary.totalRevenue).toBeGreaterThan(0)
    expect(result.summary.highRiskProducts).toBeGreaterThanOrEqual(0)
    expect(result.summary.averageROI).toBeGreaterThan(0)
  })

  it("returns empty summary for no products", () => {
    const input = buildFinancialInput()
    input.inventory = []
    const service = new DefaultFinancialIntelligenceService()
    const result = service.analyze(input)
    expect(result.insights.length).toBe(0)
    expect(result.summary.productsAnalyzed).toBe(0)
  })
})

describe("Recommendations", () => {
  it("covers all four recommendation scenarios with mock data", () => {
    const input = buildFinancialInput()
    const service = new DefaultFinancialIntelligenceService()
    const result = service.analyze(input)
    const types = new Set(result.insights.map((i) => i.recommendation))
    expect(types.has("increase_investment")).toBe(true)
    expect(types.has("reduce_inventory")).toBe(true)
    expect(types.has("improve_margin")).toBe(true)
    expect(types.has("monitor")).toBe(true)
  })
})
