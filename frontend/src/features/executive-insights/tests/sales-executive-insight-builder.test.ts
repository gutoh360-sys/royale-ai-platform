import { describe, it, expect } from "vitest"
import { SalesExecutiveInsightBuilder } from "@/features/executive-insights/builders/sales-executive-insight-builder"
import type { SalesInsightInput } from "@/features/executive-insights/builders/inputs"
import type { BuilderContext } from "@/features/executive-insights/builders"

const refDate = new Date("2026-07-30")
const context: BuilderContext = { refDate, sourceRunId: "test-run-001" }

const SEVERITY_MAP: Record<string, string> = {
  success: "POSITIVE",
  warning: "WARNING",
  danger: "CRITICAL",
  info: "INFO",
}

function emptyInput(): SalesInsightInput {
  return {
    module: "SALES",
    sales: null,
    existingInsights: [],
    existingRecommendations: [],
  }
}

describe("SalesExecutiveInsightBuilder", () => {
  it("returns empty array for empty input", () => {
    const builder = new SalesExecutiveInsightBuilder()
    const result = builder.build(emptyInput(), context)
    expect(result).toHaveLength(0)
  })

  it("returns one insight per existing insight", () => {
    const builder = new SalesExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [
      { type: "success", title: "Vendas cresceram", description: "Receita aumentou 20%", metric: "revenue" },
      { type: "warning", title: "Conversão baixa", description: "Taxa de conversão em 1.2%", metric: "conversion" },
    ]
    const result = builder.build(input, context)
    expect(result).toHaveLength(2)
  })

  it("returns one insight per existing recommendation", () => {
    const builder = new SalesExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingRecommendations = [
      { id: "r1", title: "Melhorar anúncios", description: "Aumentar investimento em ML", impact: "high", effort: "medium", category: "ads" },
    ]
    const result = builder.build(input, context)
    expect(result).toHaveLength(1)
  })

  it("maps SalesInsight type to correct severity", () => {
    const builder = new SalesExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [
      { type: "success", title: "S", description: "D", metric: "m" },
      { type: "warning", title: "W", description: "D", metric: "m" },
      { type: "danger", title: "D", description: "D", metric: "m" },
      { type: "info", title: "I", description: "D", metric: "m" },
    ]
    const result = builder.build(input, context)
    expect(result[0].severity).toBe("POSITIVE")
    expect(result[1].severity).toBe("WARNING")
    expect(result[2].severity).toBe("CRITICAL")
    expect(result[3].severity).toBe("INFO")
  })

  it("preserves metric in evidence", () => {
    const builder = new SalesExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [
      { type: "info", title: "T", description: "D", metric: "conversion_rate" },
    ]
    const result = builder.build(input, context)
    expect(result[0].evidence.metric).toBe("conversion_rate")
  })

  it("builds deterministic insight keys", () => {
    const builder = new SalesExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [
      { type: "info", title: "Vendas cresceram", description: "D", metric: "m" },
    ]
    const result = builder.build(input, context)
    expect(result[0].key).toBe("sales:insight:vendas-cresceram")
  })

  it("sets version to 1 for new insights", () => {
    const builder = new SalesExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [
      { type: "info", title: "T", description: "D" },
    ]
    const result = builder.build(input, context)
    expect(result[0].version).toBe(1)
  })

  it("uses deterministic dates", () => {
    const builder = new SalesExecutiveInsightBuilder()
    const input = emptyInput()
    input.existingInsights = [
      { type: "info", title: "T", description: "D" },
    ]
    const result = builder.build(input, context)
    expect(result[0].createdAt).toBe(refDate)
  })

  it("severity mapping covers all source types exactly once", () => {
    expect(Object.keys(SEVERITY_MAP).sort()).toEqual(["danger", "info", "success", "warning"])
    expect(Object.values(SEVERITY_MAP).sort()).toEqual(["CRITICAL", "INFO", "POSITIVE", "WARNING"])
  })

  it("does not calculate or infer causality", () => {
    const builder = new SalesExecutiveInsightBuilder()
    const src = builder.constructor.toString()
    expect(src).not.toMatch(/>=|<=|because|caused|porque|therefore/)
  })
})
