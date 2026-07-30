import { describe, it, expect } from "vitest"
import { FinancialExecutiveInsightBuilder } from "@/features/executive-insights/builders/financial-executive-insight-builder"
import { ExecutiveInsightSeverity } from "@/features/executive-insights/types"
import type { FinancialInsightInput } from "@/features/executive-insights/builders/inputs"
import type { BuilderContext } from "@/features/executive-insights/builders"
import type { FinancialData } from "@/features/financial-executive/types"

const refDate = new Date("2026-07-30")
const context: BuilderContext = { refDate, sourceRunId: "test-run-001" }

function emptyInput(): FinancialInsightInput {
  return {
    module: "FINANCIAL",
    financial: null,
    existingInsights: [],
    existingRecommendations: [],
  }
}

describe("FinancialExecutiveInsightBuilder", () => {
  it("returns empty array for empty input", () => {
    const builder = new FinancialExecutiveInsightBuilder()
    const result = builder.build(emptyInput(), context)
    expect(result).toHaveLength(0)
  })

  it("returns one insight per existing insight", () => {
    const builder = new FinancialExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [
      { fact: "Margem líquida de 35%", reason: "Boa eficiência", impact: "Lucro saudável", action: "Manter estratégia" },
      { fact: "Fluxo de caixa positivo", reason: "Gestão eficiente", impact: "Capital de giro confortável", action: "Manter política" },
    ]
    const result = builder.build(input, context)
    expect(result).toHaveLength(2)
  })

  it("returns one insight per existing recommendation", () => {
    const builder = new FinancialExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingRecommendations = [
      { action: "Reduzir despesas operacionais", reason: "Margem abaixo do esperado" },
    ]
    const result = builder.build(input, context)
    expect(result).toHaveLength(1)
  })

  it("maps both insights and recommendations combined", () => {
    const builder = new FinancialExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [
      { fact: "Fato1", reason: "R1", impact: "I1", action: "A1" },
    ]
    input.existingRecommendations = [
      { action: "Rec1", reason: "RR1" },
      { action: "Rec2", reason: "RR2" },
    ]
    const result = builder.build(input, context)
    expect(result).toHaveLength(3)
  })

  it("preserves severity as INFO", () => {
    const builder = new FinancialExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [
      { fact: "Fato", reason: "Razão", impact: "Impacto", action: "Ação" },
    ]
    const result = builder.build(input, context)
    expect(result[0].severity).toBe(ExecutiveInsightSeverity.INFO)
  })

  it("preserves recommendation from source", () => {
    const builder = new FinancialExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [
      { fact: "Fato", reason: "Razão", impact: "Impacto", action: "Reduzir custos" },
    ]
    const result = builder.build(input, context)
    expect(result[0].recommendation).toBe("Reduzir custos")
  })

  it("includes health value in evidence when available", () => {
    const builder = new FinancialExecutiveInsightBuilder()
    const input = emptyInput()
    input.financial = { health: 78 } as FinancialData
    input.existingInsights = [
      { fact: "Fato", reason: "Razão", impact: "Impacto", action: "Ação" },
    ]
    const result = builder.build(input, context)
    expect(result[0].evidence.value).toBe(78)
    expect(result[0].evidence.metric).toBe("health")
  })

  it("handles null financial gracefully", () => {
    const builder = new FinancialExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [
      { fact: "Fato", reason: "Razão", impact: "Impacto", action: "Ação" },
    ]
    const result = builder.build(input, context)
    expect(result[0].evidence.value).toBeUndefined()
  })

  it("builds deterministic insight keys", () => {
    const builder = new FinancialExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [
      { fact: "Margem líquida de 35%", reason: "R", impact: "I", action: "A" },
    ]
    const result = builder.build(input, context)
    expect(result[0].key).toBe("financial:insight:margem-liquida-de-35")
  })

  it("sets version to 1 for new insights", () => {
    const builder = new FinancialExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [
      { fact: "Fato", reason: "R", impact: "I", action: "A" },
    ]
    const result = builder.build(input, context)
    expect(result[0].version).toBe(1)
  })

  it("uses deterministic dates", () => {
    const builder = new FinancialExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [
      { fact: "Fato", reason: "Razão", impact: "Impacto", action: "Ação" },
    ]
    const result = builder.build(input, context)
    expect(result[0].createdAt).toBe(refDate)
    expect(result[0].updatedAt).toBe(refDate)
  })
})
