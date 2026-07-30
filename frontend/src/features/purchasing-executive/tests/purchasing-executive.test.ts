import { describe, it, expect } from "vitest"
import { mockReplenishmentCategories, mockSuppliers, mockPurchasingSummary } from "@/features/purchasing-executive/mocks"
import { buildPurchasingInsights, buildPurchasingRecommendations } from "@/features/purchasing-executive/utils/purchasing-insights"
import { MockPurchasingDataService } from "@/features/purchasing-executive/services/purchasing-data-service"

describe("purchasing-executive types and mocks", () => {
  it("has 4 replenishment categories", () => {
    expect(mockReplenishmentCategories.length).toBe(4)
  })

  it("has 5 suppliers", () => {
    expect(mockSuppliers.length).toBe(5)
  })

  it("purchasing summary has all required fields", () => {
    const s = mockPurchasingSummary
    expect(s.productsToReplenish).toBeGreaterThan(0)
    expect(s.totalUnitsToBuy).toBeGreaterThan(0)
    expect(s.capitalInPurchases).toBeTruthy()
    expect(s.suppliers).toBe(5)
    expect(s.averageCoverage).toBeTruthy()
    expect(s.averageLeadTime).toBeTruthy()
    expect(s.health).toBeGreaterThanOrEqual(0)
    expect(s.health).toBeLessThanOrEqual(100)
  })
})

describe("buildPurchasingInsights", () => {
  const input = {
    categories: mockReplenishmentCategories.map((c) => ({
      name: c.name,
      productsToBuy: c.productsToBuy,
      totalUnits: c.totalUnits,
      estimatedInvestment: c.estimatedInvestment,
      formattedInvestment: c.formattedInvestment,
      averageCoverage: c.averageCoverage,
      priority: c.priority,
    })),
    suppliers: mockSuppliers.map((s) => ({
      name: s.name,
      share: s.share,
      formattedShare: s.formattedShare,
      leadTimeDays: s.leadTimeDays,
      activeOrders: s.activeOrders,
      reliability: s.reliability,
    })),
    totalCapital: mockPurchasingSummary.capitalInPurchases,
    averageCoverage: mockPurchasingSummary.averageCoverage,
    averageLeadTime: mockPurchasingSummary.averageLeadTime,
    productsToReplenish: mockPurchasingSummary.productsToReplenish,
    totalUnitsToBuy: mockPurchasingSummary.totalUnitsToBuy,
  }

  it("returns insights", () => {
    const result = buildPurchasingInsights(input)
    expect(result.length).toBeGreaterThanOrEqual(2)
  })

  it("insights have fact, reason, impact, action", () => {
    const result = buildPurchasingInsights(input)
    for (const insight of result) {
      expect(insight.fact).toBeTruthy()
      expect(insight.reason).toBeTruthy()
      expect(insight.impact).toBeTruthy()
      expect(insight.action).toBeTruthy()
    }
  })

  it("no arbitrary thresholds in insights", () => {
    const result = buildPurchasingInsights(input)
    const allText = result.map((i) => `${i.fact} ${i.reason} ${i.impact} ${i.action}`).join(" ")
    expect(allText).not.toMatch(/threshold|limiar|acima de \d+%?/i)
  })

  it("mentions category names from mock data", () => {
    const result = buildPurchasingInsights(input)
    const allText = result.map((i) => i.fact).join(" ")
    expect(allText).toMatch(/Eletrônicos|Casa|Móveis|Moda/)
  })
})

describe("buildPurchasingRecommendations", () => {
  const input = {
    categories: mockReplenishmentCategories.map((c) => ({
      name: c.name,
      productsToBuy: c.productsToBuy,
      totalUnits: c.totalUnits,
      estimatedInvestment: c.estimatedInvestment,
      formattedInvestment: c.formattedInvestment,
      averageCoverage: c.averageCoverage,
      priority: c.priority,
    })),
    suppliers: mockSuppliers.map((s) => ({
      name: s.name,
      share: s.share,
      formattedShare: s.formattedShare,
      leadTimeDays: s.leadTimeDays,
      activeOrders: s.activeOrders,
      reliability: s.reliability,
    })),
    totalCapital: mockPurchasingSummary.capitalInPurchases,
    averageCoverage: mockPurchasingSummary.averageCoverage,
    averageLeadTime: mockPurchasingSummary.averageLeadTime,
    productsToReplenish: mockPurchasingSummary.productsToReplenish,
    totalUnitsToBuy: mockPurchasingSummary.totalUnitsToBuy,
  }

  it("returns recommendations", () => {
    const result = buildPurchasingRecommendations(input)
    expect(result.length).toBeGreaterThanOrEqual(2)
  })

  it("recommendations have action and reason", () => {
    const result = buildPurchasingRecommendations(input)
    for (const rec of result) {
      expect(rec.action).toBeTruthy()
      expect(rec.reason).toBeTruthy()
    }
  })
})

describe("MockPurchasingDataService", () => {
  it("returns data with success status", async () => {
    const service = new MockPurchasingDataService()
    const result = await service.fetch()
    expect(result.status).toBe("success")
    expect(result.categories.length).toBeGreaterThan(0)
    expect(result.suppliers.length).toBeGreaterThan(0)
    expect(result.summary.productsToReplenish).toBeGreaterThan(0)
    expect(result.error).toBeNull()
  })
})
