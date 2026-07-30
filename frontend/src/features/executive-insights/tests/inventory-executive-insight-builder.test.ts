import { describe, it, expect } from "vitest"
import { InventoryExecutiveInsightBuilder } from "@/features/executive-insights/builders/inventory-executive-insight-builder"
import { ExecutiveInsightSeverity } from "@/features/executive-insights/types"
import type { InventoryInsightInput } from "@/features/executive-insights/builders/inputs"
import type { BuilderContext } from "@/features/executive-insights/builders"
import type { InventoryData } from "@/features/inventory-executive/types"

const refDate = new Date("2026-07-30")
const context: BuilderContext = { refDate, sourceRunId: "test-run-001" }

function emptyInput(): InventoryInsightInput {
  return {
    module: "INVENTORY",
    inventory: null,
    existingInsights: [],
    existingRecommendations: [],
  }
}

describe("InventoryExecutiveInsightBuilder", () => {
  it("returns empty array for empty input", () => {
    const builder = new InventoryExecutiveInsightBuilder()
    const result = builder.build(emptyInput(), context)
    expect(result).toHaveLength(0)
  })

  it("returns one insight per existing insight", () => {
    const builder = new InventoryExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [
      { fact: "3 produtos em estoque crítico", reason: "Baixa cobertura", impact: "Risco de ruptura", action: "Comprar urgente" },
    ]
    const result = builder.build(input, context)
    expect(result).toHaveLength(1)
  })

  it("returns combined insights and recommendations", () => {
    const builder = new InventoryExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [{ fact: "F1", reason: "R1", impact: "I1", action: "A1" }]
    input.existingRecommendations = [{ action: "Rec1", reason: "RR1" }]
    const result = builder.build(input, context)
    expect(result).toHaveLength(2)
  })

  it("preserves severity as INFO", () => {
    const builder = new InventoryExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [{ fact: "F", reason: "R", impact: "I", action: "A" }]
    const result = builder.build(input, context)
    expect(result[0].severity).toBe(ExecutiveInsightSeverity.INFO)
  })

  it("preserves fact and recommendation", () => {
    const builder = new InventoryExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [{ fact: "Capital imobilizado de R$ 12.450", reason: "Estoque parado", impact: "Recursos presos", action: "Liquidar excesso" }]
    const result = builder.build(input, context)
    expect(result[0].fact).toBe("Capital imobilizado de R$ 12.450")
    expect(result[0].recommendation).toBe("Liquidar excesso")
  })

  it("includes inventory health in evidence", () => {
    const builder = new InventoryExecutiveInsightBuilder()
    const input = emptyInput()
    input.inventory = { health: 65 } as InventoryData
    input.existingInsights = [{ fact: "F", reason: "R", impact: "I", action: "A" }]
    const result = builder.build(input, context)
    expect(result[0].evidence.metric).toBe("health")
    expect(result[0].evidence.value).toBe(65)
  })

  it("builds deterministic insight keys", () => {
    const builder = new InventoryExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [{ fact: "3 produtos em estoque crítico", reason: "R", impact: "I", action: "A" }]
    const result = builder.build(input, context)
    expect(result[0].key).toBe("inventory:insight:3-produtos-em-estoque-critico")
  })

  it("sets version to 1 for new insights", () => {
    const builder = new InventoryExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [{ fact: "F", reason: "R", impact: "I", action: "A" }]
    const result = builder.build(input, context)
    expect(result[0].version).toBe(1)
  })

  it("uses deterministic dates", () => {
    const builder = new InventoryExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [{ fact: "F", reason: "R", impact: "I", action: "A" }]
    const result = builder.build(input, context)
    expect(result[0].createdAt).toBe(refDate)
  })
})
