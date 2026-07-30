import { describe, it, expect } from "vitest"
import { ProductsExecutiveInsightBuilder } from "@/features/executive-insights/builders/products-executive-insight-builder"
import { ExecutiveInsightSeverity } from "@/features/executive-insights/types"
import type { ProductsInsightInput } from "@/features/executive-insights/builders/inputs"
import type { BuilderContext } from "@/features/executive-insights/builders"

const refDate = new Date("2026-07-30")
const context: BuilderContext = { refDate, sourceRunId: "test-run-001" }

function emptyInput(): ProductsInsightInput {
  return {
    module: "PRODUCTS",
    products: [],
    categories: [],
    summary: {
      totalProducts: 0,
      activeProducts: 0,
      formattedActiveProducts: "0",
      categories: 0,
      topSku: "",
      topSkuName: "",
      topSkuRevenue: "",
      averageRevenuePerProduct: "",
      averageMargin: "",
      averageMarginValue: 0,
      top10Concentration: "",
      top10ConcentrationValue: 0,
      totalRevenue: "",
      totalRevenueValue: 0,
      health: 0,
      growth: 0,
    },
    existingInsights: [],
    existingRecommendations: [],
  }
}

describe("ProductsExecutiveInsightBuilder", () => {
  it("returns empty array for empty input", () => {
    const builder = new ProductsExecutiveInsightBuilder()
    const result = builder.build(emptyInput(), context)
    expect(result).toHaveLength(0)
  })

  it("returns one insight per existing insight", () => {
    const builder = new ProductsExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [
      { fact: "Produto X é o top seller", reason: "Maior receita", impact: "Líder de vendas", action: "Manter estoque" },
    ]
    const result = builder.build(input, context)
    expect(result).toHaveLength(1)
  })

  it("returns combined insights and recommendations", () => {
    const builder = new ProductsExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [{ fact: "F1", reason: "R1", impact: "I1", action: "A1" }]
    input.existingRecommendations = [{ action: "Rec1", reason: "RR1" }]
    const result = builder.build(input, context)
    expect(result).toHaveLength(2)
  })

  it("preserves severity as INFO", () => {
    const builder = new ProductsExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [{ fact: "F", reason: "R", impact: "I", action: "A" }]
    const result = builder.build(input, context)
    expect(result[0].severity).toBe(ExecutiveInsightSeverity.INFO)
  })

  it("includes summary health in evidence", () => {
    const builder = new ProductsExecutiveInsightBuilder()
    const input = emptyInput()
    input.summary.health = 85
    input.existingInsights = [{ fact: "F", reason: "R", impact: "I", action: "A" }]
    const result = builder.build(input, context)
    expect(result[0].evidence.value).toBe(85)
  })

  it("builds deterministic insight keys", () => {
    const builder = new ProductsExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [{ fact: "Produto X é o top seller", reason: "R", impact: "I", action: "A" }]
    const result = builder.build(input, context)
    expect(result[0].key).toBe("products:insight:produto-x-e-o-top-seller")
  })

  it("sets version to 1 for new insights", () => {
    const builder = new ProductsExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [{ fact: "F", reason: "R", impact: "I", action: "A" }]
    const result = builder.build(input, context)
    expect(result[0].version).toBe(1)
  })

  it("uses deterministic dates", () => {
    const builder = new ProductsExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [{ fact: "F", reason: "R", impact: "I", action: "A" }]
    const result = builder.build(input, context)
    expect(result[0].createdAt).toBe(refDate)
  })

  it("does not calculate or mutate", () => {
    const builder = new ProductsExecutiveInsightBuilder()
    const src = builder.constructor.toString()
    expect(src).not.toMatch(/>=|<=|calc|threshold/)
  })
})
