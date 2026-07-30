import { describe, it, expect } from "vitest"
import { MarketplaceExecutiveInsightBuilder } from "@/features/executive-insights/builders/marketplace-executive-insight-builder"
import { ExecutiveInsightCategory, ExecutiveInsightSeverity } from "@/features/executive-insights/types"
import type { MarketplaceInsightInput } from "@/features/executive-insights/builders/inputs"
import type { BuilderContext } from "@/features/executive-insights/builders"

const refDate = new Date("2026-07-30")
const context: BuilderContext = { refDate, sourceRunId: "test-run-001" }

function emptyInput(): MarketplaceInsightInput {
  return {
    module: "MARKETPLACE",
    marketplaces: [],
    summary: {
      totalRevenue: "R$ 0",
      totalOrders: 0,
      formattedTotalOrders: "0",
      averageTicket: "R$ 0",
      leaderName: "none",
      highestGrowth: 0,
      highestGrowthName: "",
      averageHealth: 0,
    },
    existingInsights: [],
    existingRecommendations: [],
  }
}

describe("MarketplaceExecutiveInsightBuilder", () => {
  it("returns empty array for empty input", () => {
    const builder = new MarketplaceExecutiveInsightBuilder()
    const result = builder.build(emptyInput(), context)
    expect(result).toHaveLength(0)
  })

  it("returns one insight per existing insight", () => {
    const builder = new MarketplaceExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [
      { fact: "Mercado Livre cresceu 15%", reason: "Alta demanda", impact: "Aumento de receita", action: "Investir em anúncios" },
      { fact: "Shopee com 82% de saúde", reason: "Bom desempenho", impact: "Market share estável", action: "Manter operação" },
    ]
    const result = builder.build(input, context)
    expect(result).toHaveLength(2)
  })

  it("returns one insight per existing recommendation", () => {
    const builder = new MarketplaceExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingRecommendations = [
      { action: "Aumentor verba em ML", reason: "Maior retorno sobre investimento" },
    ]
    const result = builder.build(input, context)
    expect(result).toHaveLength(1)
  })

  it("preserves severity as INFO for standard insights", () => {
    const builder = new MarketplaceExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [
      { fact: "Fato", reason: "Razão", impact: "Impacto", action: "Ação" },
    ]
    const result = builder.build(input, context)
    expect(result[0].severity).toBe(ExecutiveInsightSeverity.INFO)
  })

  it("preserves recommendation from source", () => {
    const builder = new MarketplaceExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [
      { fact: "Fato", reason: "Razão", impact: "Impacto", action: "Investir em anúncios" },
    ]
    const result = builder.build(input, context)
    expect(result[0].recommendation).toBe("Investir em anúncios")
  })

  it("preserves evidence with source", () => {
    const builder = new MarketplaceExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [
      { fact: "Fato", reason: "Razão", impact: "Impacto", action: "Ação" },
    ]
    const result = builder.build(input, context)
    expect(result[0].evidence.source).toBe("marketplace")
    expect(result[0].evidence.generatedAt).toBe(refDate.toISOString())
  })

  it("builds deterministic IDs", () => {
    const builder = new MarketplaceExecutiveInsightBuilder()
    const input = emptyInput()
    input.summary.leaderName = "Mercado Livre"
    input.existingInsights = [
      { fact: "Fato", reason: "Razão", impact: "Impacto", action: "Ação" },
    ]
    const result = builder.build(input, context)
    expect(result[0].id).toBe("marketplace-insight-mercado-livre-0")
  })

  it("builds deterministic insight keys", () => {
    const builder = new MarketplaceExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [
      { fact: "Mercado Livre cresceu 15%", reason: "R", impact: "I", action: "A" },
    ]
    const result = builder.build(input, context)
    expect(result[0].key).toBe("marketplace:insight:mercado-livre-cresceu-15")
  })

  it("sets version to 1 for new insights", () => {
    const builder = new MarketplaceExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [
      { fact: "Fato", reason: "R", impact: "I", action: "A" },
    ]
    const result = builder.build(input, context)
    expect(result[0].version).toBe(1)
  })

  it("uses deterministic dates", () => {
    const builder = new MarketplaceExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [
      { fact: "Fato", reason: "Razão", impact: "Impacto", action: "Ação" },
    ]
    const result = builder.build(input, context)
    expect(result[0].createdAt).toBe(refDate)
    expect(result[0].updatedAt).toBe(refDate)
  })

  it("returns readonly array", () => {
    const builder = new MarketplaceExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [
      { fact: "Fato", reason: "Razão", impact: "Impacto", action: "Ação" },
    ]
    const result = builder.build(input, context)
    expect(Array.isArray(result)).toBe(true)
  })

  it("does not mutate input", () => {
    const builder = new MarketplaceExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [
      { fact: "Fato", reason: "Razão", impact: "Impacto", action: "Ação" },
    ]
    const originalLength = input.existingInsights.length
    builder.build(input, context)
    expect(input.existingInsights).toHaveLength(originalLength)
  })

  it("has readonly module property", () => {
    const builder = new MarketplaceExecutiveInsightBuilder()
    expect(builder.module).toBe(ExecutiveInsightCategory.MARKETPLACE)
  })

  it("no calculation or threshold", () => {
    const builder = new MarketplaceExecutiveInsightBuilder()
    const src = builder.constructor.toString()
    expect(src).not.toMatch(/>=|<=|healthScore|calc|threshold|margin|growth/)
  })
})
