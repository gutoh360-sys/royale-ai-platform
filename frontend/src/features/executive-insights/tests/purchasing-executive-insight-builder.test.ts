import { describe, it, expect } from "vitest"
import { PurchasingExecutiveInsightBuilder } from "@/features/executive-insights/builders/purchasing-executive-insight-builder"
import { ExecutiveInsightSeverity } from "@/features/executive-insights/types"
import type { PurchasingInsightInput } from "@/features/executive-insights/builders/inputs"
import type { BuilderContext } from "@/features/executive-insights/builders"

const refDate = new Date("2026-07-30")
const context: BuilderContext = { refDate, sourceRunId: "test-run-001" }

function emptyInput(): PurchasingInsightInput {
  return {
    module: "PURCHASING",
    categories: [],
    suppliers: [],
    summary: {
      productsToReplenish: 0,
      totalUnitsToBuy: 0,
      capitalInPurchases: "",
      capitalInPurchasesValue: 0,
      averageCoverage: "",
      averageCoverageDays: 0,
      pendingOrders: 0,
      suppliers: 0,
      averageLeadTime: "",
      averageLeadTimeDays: 0,
      health: 0,
      generalPriority: "",
      highestRisk: "",
    },
    existingInsights: [],
    existingRecommendations: [],
  }
}

describe("PurchasingExecutiveInsightBuilder", () => {
  it("returns empty array for empty input", () => {
    const builder = new PurchasingExecutiveInsightBuilder()
    const result = builder.build(emptyInput(), context)
    expect(result).toHaveLength(0)
  })

  it("returns one insight per existing insight", () => {
    const builder = new PurchasingExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [
      { fact: "8 produtos para repor", reason: "Cobertura baixa", impact: "Risco de desabastecimento", action: "Disparar compras" },
    ]
    const result = builder.build(input, context)
    expect(result).toHaveLength(1)
  })

  it("returns combined insights and recommendations", () => {
    const builder = new PurchasingExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [{ fact: "F1", reason: "R1", impact: "I1", action: "A1" }]
    input.existingRecommendations = [{ action: "Rec1", reason: "RR1" }]
    const result = builder.build(input, context)
    expect(result).toHaveLength(2)
  })

  it("preserves severity as INFO", () => {
    const builder = new PurchasingExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [{ fact: "F", reason: "R", impact: "I", action: "A" }]
    const result = builder.build(input, context)
    expect(result[0].severity).toBe(ExecutiveInsightSeverity.INFO)
  })

  it("includes summary health in evidence", () => {
    const builder = new PurchasingExecutiveInsightBuilder()
    const input = emptyInput()
    input.summary.health = 62
    input.existingInsights = [{ fact: "F", reason: "R", impact: "I", action: "A" }]
    const result = builder.build(input, context)
    expect(result[0].evidence.value).toBe(62)
  })

  it("includes highestRisk in evidence", () => {
    const builder = new PurchasingExecutiveInsightBuilder()
    const input = emptyInput()
    input.summary.health = 62
    input.summary.highestRisk = "Fornecedor X"
    input.existingInsights = [{ fact: "F", reason: "R", impact: "I", action: "A" }]
    const result = builder.build(input, context)
    expect(result[0].evidence.value).toBe(62)
  })

  it("preserves recommendation from source", () => {
    const builder = new PurchasingExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [{ fact: "F", reason: "R", impact: "I", action: "Comprar 150 unidades" }]
    const result = builder.build(input, context)
    expect(result[0].recommendation).toBe("Comprar 150 unidades")
  })

  it("builds deterministic insight keys", () => {
    const builder = new PurchasingExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [{ fact: "8 produtos para repor", reason: "R", impact: "I", action: "A" }]
    const result = builder.build(input, context)
    expect(result[0].key).toBe("purchasing:insight:8-produtos-para-repor")
  })

  it("sets version to 1 for new insights", () => {
    const builder = new PurchasingExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [{ fact: "F", reason: "R", impact: "I", action: "A" }]
    const result = builder.build(input, context)
    expect(result[0].version).toBe(1)
  })

  it("uses deterministic dates", () => {
    const builder = new PurchasingExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [{ fact: "F", reason: "R", impact: "I", action: "A" }]
    const result = builder.build(input, context)
    expect(result[0].createdAt).toBe(refDate)
  })
})
