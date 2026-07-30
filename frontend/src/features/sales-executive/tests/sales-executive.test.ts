import { describe, it, expect } from "vitest"
import { HIGH_GROWTH_THRESHOLD, HIGH_CONVERSION_THRESHOLD, LOW_CONVERSION_THRESHOLD } from "@/features/sales-intelligence/constants"
import { MARKETPLACE_HEALTH_THRESHOLD } from "@/features/executive-intelligence/constants"
import { buildSalesInsights, buildSalesRecommendations } from "@/features/sales-executive/utils/sales-insights"

const baseData = {
  revenue: 278400,
  formattedRevenue: "R$ 278,4k",
  orders: 2310,
  formattedOrders: "2.310",
  averageTicket: 120.52,
  formattedAverageTicket: "R$ 120,52",
  conversionRate: 0.052,
  formattedConversionRate: "5,2%",
  productsSold: 142,
  formattedProductsSold: "142",
  customersServed: 1890,
  formattedCustomersServed: "1.890",
  growth: 12,
  formattedGrowth: "12%",
  health: 82,
  formattedHealth: "82%",
  period: { start: "2026-01-01", end: "2026-01-31", label: "Últimos 30 dias" },
}

const healthyData = { ...baseData, health: 95, growth: 20, conversionRate: 0.09, formattedConversionRate: "9,0%" }

const criticalConversionData = { ...baseData, conversionRate: 0.008, formattedConversionRate: "0,8%", health: 70, growth: 8 }

const midRangeData = { ...baseData, conversionRate: 0.035, formattedConversionRate: "3,5%", health: 70, growth: 7 }

describe("buildSalesInsights", () => {
  it("returns 3 insights", () => {
    expect(buildSalesInsights(baseData)).toHaveLength(3)
  })

  it("returns success type for healthy data (all above thresholds)", () => {
    const insights = buildSalesInsights(healthyData)
    expect(insights.every((i) => i.type === "success")).toBe(true)
  })

  it("returns danger for low conversion (at or below LOW_CONVERSION_THRESHOLD)", () => {
    const insights = buildSalesInsights(criticalConversionData)
    const convInsight = insights[2]
    expect(convInsight.type).toBe("danger")
  })

  it("returns info for mid-range values (between thresholds)", () => {
    const insights = buildSalesInsights(midRangeData)
    expect(insights.every((i) => ["info", "success"].includes(i.type))).toBe(true)
    expect(insights.some((i) => i.type === "info")).toBe(true)
  })

  it("each insight has title, description, type", () => {
    for (const insight of buildSalesInsights(baseData)) {
      expect(insight.title).toBeTruthy()
      expect(insight.description).toBeTruthy()
      expect(["success", "warning", "danger", "info"]).toContain(insight.type)
    }
  })

  it("includes metric in each insight", () => {
    for (const insight of buildSalesInsights(baseData)) {
      expect(insight.metric).toBeTruthy()
    }
  })
})

describe("buildSalesRecommendations", () => {
  it("returns at least 1 recommendation", () => {
    expect(buildSalesRecommendations(baseData).length).toBeGreaterThanOrEqual(1)
  })

  it("returns recommendation for low conversion (at or below LOW_CONVERSION_THRESHOLD)", () => {
    const recs = buildSalesRecommendations(criticalConversionData)
    expect(recs.length).toBeGreaterThanOrEqual(1)
    const hasConvRec = recs.some((r) => r.id === "sales-rec-conv")
    expect(hasConvRec).toBe(true)
  })

  it("returns 1 recommendation (maintain) for healthy data", () => {
    expect(buildSalesRecommendations(healthyData)).toHaveLength(1)
  })

  it("each recommendation has action and reason", () => {
    for (const rec of buildSalesRecommendations(baseData)) {
      expect(rec.title).toBeTruthy()
      expect(rec.description).toBeTruthy()
      expect(["high", "medium", "low"]).toContain(rec.impact)
      expect(["high", "medium", "low"]).toContain(rec.effort)
      expect(rec.category).toBeTruthy()
    }
  })

  it("healthy data recommendation is to maintain", () => {
    const recs = buildSalesRecommendations(healthyData)
    expect(recs[0].title).toContain("Manter")
  })
})

describe("threshold provenance", () => {
  it("health threshold is MARKETPLACE_HEALTH_THRESHOLD from executive-intelligence (80)", () => {
    const src = buildSalesInsights.toString()
    expect(src).toContain("MARKETPLACE_HEALTH_THRESHOLD")
    expect(MARKETPLACE_HEALTH_THRESHOLD).toBe(80)
  })

  it("growth threshold is HIGH_GROWTH_THRESHOLD from sales-intelligence (10)", () => {
    const src = buildSalesInsights.toString()
    expect(src).toContain("HIGH_GROWTH_THRESHOLD")
    expect(HIGH_GROWTH_THRESHOLD).toBe(10)
  })

  it("conversion thresholds are HIGH_CONVERSION_THRESHOLD (0.05) and LOW_CONVERSION_THRESHOLD (0.01) from sales-intelligence", () => {
    const src = buildSalesInsights.toString()
    expect(src).toContain("HIGH_CONVERSION_THRESHOLD")
    expect(src).toContain("LOW_CONVERSION_THRESHOLD")
    expect(HIGH_CONVERSION_THRESHOLD).toBe(0.05)
    expect(LOW_CONVERSION_THRESHOLD).toBe(0.01)
  })

  it("recommendations use only LOW_CONVERSION_THRESHOLD from sales-intelligence", () => {
    const recSrc = buildSalesRecommendations.toString()
    expect(recSrc).toContain("LOW_CONVERSION_THRESHOLD")
  })
})
