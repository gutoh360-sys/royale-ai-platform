import { describe, it, expect } from "vitest"
import { mockProducts, mockCategories, mockPortfolioSummary } from "@/features/products-executive/mocks"
import { buildProductsInsights, buildProductsRecommendations } from "@/features/products-executive/utils/products-insights"
import { MockProductsDataService } from "@/features/products-executive/services/products-data-service"

describe("products-executive types and mocks", () => {
  it("has 12 products in mock data", () => {
    expect(mockProducts.length).toBe(12)
  })

  it("has 5 categories in mock data", () => {
    expect(mockCategories.length).toBe(5)
  })

  it("portfolio summary has all required fields", () => {
    const s = mockPortfolioSummary
    expect(s.totalProducts).toBe(12)
    expect(s.categories).toBe(5)
    expect(s.activeProducts).toBeGreaterThan(0)
    expect(s.topSku).toBeTruthy()
    expect(s.averageMargin).toBeTruthy()
    expect(s.averageRevenuePerProduct).toBeTruthy()
    expect(s.top10Concentration).toBeTruthy()
    expect(s.health).toBeGreaterThanOrEqual(0)
    expect(s.health).toBeLessThanOrEqual(100)
  })
})

describe("buildProductsInsights", () => {
  const input = {
    products: mockProducts.map((p) => ({
      name: p.name,
      revenue: p.revenue,
      formattedRevenue: p.formattedRevenue,
      margin: p.margin,
      formattedMargin: p.formattedMargin,
      growth: p.growth,
      share: p.share,
      formattedShare: p.formattedShare,
    })),
    categories: mockCategories.map((c) => ({
      name: c.name,
      formattedRevenue: c.formattedRevenue,
      growth: c.growth,
    })),
    totalRevenue: mockPortfolioSummary.totalRevenue,
    topSkuName: mockPortfolioSummary.topSkuName,
    topSkuRevenue: mockPortfolioSummary.topSkuRevenue,
  }

  it("returns at least 3 insights", () => {
    const result = buildProductsInsights(input)
    expect(result.length).toBeGreaterThanOrEqual(3)
  })

  it("first insight mentions top revenue product", () => {
    const result = buildProductsInsights(input)
    const topProduct = [...mockProducts].sort((a, b) => b.revenue - a.revenue)[0]
    expect(result[0].fact).toContain(topProduct.name)
  })

  it("insights have fact, reason, impact, action", () => {
    const result = buildProductsInsights(input)
    for (const insight of result) {
      expect(insight.fact).toBeTruthy()
      expect(insight.reason).toBeTruthy()
      expect(insight.impact).toBeTruthy()
      expect(insight.action).toBeTruthy()
    }
  })

  it("no arbitrary numeric thresholds in insights", () => {
    const result = buildProductsInsights(input)
    const allText = result.map((i) => `${i.fact} ${i.reason} ${i.impact} ${i.action}`).join(" ")
    expect(allText).not.toMatch(/threshold|limiar|acima de \d+%?/i)
  })
})

describe("buildProductsRecommendations", () => {
  const input = {
    products: mockProducts.map((p) => ({
      name: p.name,
      revenue: p.revenue,
      formattedRevenue: p.formattedRevenue,
      margin: p.margin,
      formattedMargin: p.formattedMargin,
      growth: p.growth,
      share: p.share,
      formattedShare: p.formattedShare,
    })),
    categories: mockCategories.map((c) => ({
      name: c.name,
      formattedRevenue: c.formattedRevenue,
      growth: c.growth,
    })),
    totalRevenue: mockPortfolioSummary.totalRevenue,
    topSkuName: mockPortfolioSummary.topSkuName,
    topSkuRevenue: mockPortfolioSummary.topSkuRevenue,
  }

  it("returns recommendations", () => {
    const result = buildProductsRecommendations(input)
    expect(result.length).toBeGreaterThanOrEqual(3)
  })

  it("recommendations have action and reason", () => {
    const result = buildProductsRecommendations(input)
    for (const rec of result) {
      expect(rec.action).toBeTruthy()
      expect(rec.reason).toBeTruthy()
    }
  })
})

describe("MockProductsDataService", () => {
  it("returns products with success status", async () => {
    const service = new MockProductsDataService()
    const result = await service.fetch()
    expect(result.status).toBe("success")
    expect(result.products.length).toBeGreaterThan(0)
    expect(result.categories.length).toBeGreaterThan(0)
    expect(result.summary.totalProducts).toBeGreaterThan(0)
    expect(result.error).toBeNull()
  })
})
