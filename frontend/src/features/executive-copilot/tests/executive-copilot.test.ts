import { describe, it, expect } from "vitest"
import { DefaultExecutiveCopilotService } from "@/features/executive-copilot/services"
import type { CopilotInput } from "@/features/executive-copilot/services"

function buildMockInput(): CopilotInput {
  return {
    financialSummary: {
      productsAnalyzed: 20, totalRevenue: 214350, estimatedGrossProfit: 86500, averageMargin: 35,
      idleCapital: 12450, workingCapital: 8500, highRiskProducts: 3, averageROI: 42, averagePayback: 65,
      financialHealthScore: 64,
    },
    inventorySummary: {
      totalProducts: 21, activeProducts: 19, outOfStockCount: 0, stockoutRiskCount: 3,
      lowStockCount: 2, overstockCount: 4, slowMovingCount: 2, healthyCount: 8,
      totalSuggestedPurchaseUnits: 0, estimatedSuggestedPurchaseCost: 0, idleCapitalProductCount: 6,
      idleCapitalValue: 12450, averageCoverageDays: 45, criticalReplenishmentCount: 3, topReplenishmentProducts: [],
    },
    marketplaceSummary: {
      totalRevenue: "R$ 278.400", totalOrders: 2310, formattedTotalOrders: "2.310",
      averageTicket: "R$ 120,52", leaderName: "Mercado Livre", highestGrowth: 15,
      highestGrowthName: "Shopee", averageHealth: 82,
    },
    salesSummary: {
      productsAnalyzed: 12, highOpportunities: 5, criticalProducts: 2,
      estimatedRevenuePotential: 8500, estimatedMarginPotential: 3200,
      averageConversion: 0.035, averageStockCoverage: 45,
    },
    purchaseSummary: {
      totalProducts: 8, criticalProducts: 3, recommendedInvestment: 45000,
      estimatedProtectedRevenue: 120000, estimatedProtectedMargin: 48000,
      averageCoverage: 18.5, highestRisk: "critical",
    },
    executiveInsights: [],
  }
}

describe("ExecutiveCopilotService", () => {
  it("composes data from all engines", () => {
    const service = new DefaultExecutiveCopilotService()
    const result = service.compose(buildMockInput())
    expect(result.timestamp).toBeTruthy()
    expect(result.health).toBeTruthy()
    expect(result.topPriorities.length).toBeGreaterThan(0)
    expect(result.financialSnapshot.revenue).toBe(214350)
    expect(result.inventorySnapshot.totalProducts).toBe(19)
    expect(result.marketplaceSnapshot.totalOrders).toBe(2310)
  })

  it("returns healthy when score >= 70", () => {
    const input = buildMockInput()
    input.financialSummary.financialHealthScore = 85
    const service = new DefaultExecutiveCopilotService()
    const result = service.compose(input)
    expect(result.health.status).toBe("healthy")
  })

  it("returns attention when score between 40 and 69", () => {
    const input = buildMockInput()
    input.financialSummary.financialHealthScore = 55
    const service = new DefaultExecutiveCopilotService()
    const result = service.compose(input)
    expect(result.health.status).toBe("attention")
  })

  it("returns critical when score < 40", () => {
    const input = buildMockInput()
    input.financialSummary.financialHealthScore = 25
    const service = new DefaultExecutiveCopilotService()
    const result = service.compose(input)
    expect(result.health.status).toBe("critical")
  })

  it("includes purchase summary financial data", () => {
    const input = buildMockInput()
    const service = new DefaultExecutiveCopilotService()
    const result = service.compose(input)
    expect(result.financialSnapshot.healthScore).toBe(64)
    expect(result.financialSnapshot.averageROI).toBe(42)
  })

  it("includes inventory snapshot correctly", () => {
    const input = buildMockInput()
    const service = new DefaultExecutiveCopilotService()
    const result = service.compose(input)
    expect(result.inventorySnapshot.outOfStock).toBe(0)
    expect(result.inventorySnapshot.stockoutRisk).toBe(3)
    expect(result.inventorySnapshot.overstock).toBe(4)
  })
})

describe("Integration", () => {
  it("handles empty engine data gracefully via default values", () => {
    const input = buildMockInput()
    input.financialSummary.productsAnalyzed = 0
    input.financialSummary.totalRevenue = 0
    input.financialSummary.financialHealthScore = 0
    input.financialSummary.highRiskProducts = 0
    input.financialSummary.averageMargin = null
    input.inventorySummary.totalProducts = 0
    input.inventorySummary.activeProducts = 0
    input.inventorySummary.criticalReplenishmentCount = 0
    input.inventorySummary.idleCapitalValue = 0
    input.inventorySummary.overstockCount = 0
    input.salesSummary.highOpportunities = 0
    input.purchaseSummary.criticalProducts = 0

    const service = new DefaultExecutiveCopilotService()
    const result = service.compose(input)
    expect(result.health.status).toBe("critical")
    expect(result.topPriorities.length).toBe(1)
    expect(result.topPriorities[0].title).toBe("Operação estável")
    expect(result.recommendedActions.length).toBe(0)
  })
})
