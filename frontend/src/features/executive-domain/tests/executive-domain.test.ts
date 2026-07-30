import { describe, it, expect } from "vitest"
import { ExecutiveInsightCard } from "@/features/executive-domain/components/executive-insight-card"
import { ExecutiveRecommendationCard } from "@/features/executive-domain/components/executive-recommendation-card"
import type { InsightData, InsightPriority, RecommendationData } from "@/features/executive-domain/components"

const baseInsight: InsightData = {
  fact: "Capital imobilizado de R$ 187 mil",
  reason: "5 produtos sem giro ou em excesso",
  impact: "Recursos financeiros presos em estoque parado",
  action: "Revisar política de compras e promoções",
}

const criticalInsight: InsightData = {
  fact: "Capital imobilizado de R$ 250 mil",
  reason: "8 produtos sem giro ou em excesso",
  impact: "Risco financeiro elevado",
  action: "Revisar política de compras urgentemente",
}

const healthyInsight: InsightData = {
  fact: "Capital imobilizado de R$ 0",
  reason: "Nenhum produto sem giro",
  impact: "Recursos otimizados",
  action: "Manter estratégia atual",
}

const baseRecommendation: RecommendationData = {
  action: "Revisar estoques críticos",
  reason: "5 produtos estão sem giro ou em excesso",
}

describe("executive-domain components are importable", () => {
  it("exports ExecutiveInsightCard as a function", () => {
    expect(typeof ExecutiveInsightCard).toBe("function")
  })

  it("exports ExecutiveRecommendationCard as a function", () => {
    expect(typeof ExecutiveRecommendationCard).toBe("function")
  })
})

describe("InsightData type structure", () => {
  it("accepts valid insight data", () => {
    const insight: InsightData = baseInsight
    expect(insight.fact).toBeTruthy()
    expect(insight.reason).toBeTruthy()
    expect(insight.impact).toBeTruthy()
    expect(insight.action).toBeTruthy()
  })

  it("accepts critical insight data", () => {
    const insight: InsightData = criticalInsight
    expect(insight.fact).toContain("250 mil")
  })

  it("accepts healthy insight data", () => {
    const insight: InsightData = healthyInsight
    expect(insight.fact).toContain("R$ 0")
  })
})

describe("InsightPriority type", () => {
  it("accepts alta priority", () => {
    const p: InsightPriority = "alta"
    expect(p).toBe("alta")
  })

  it("accepts media priority", () => {
    const p: InsightPriority = "media"
    expect(p).toBe("media")
  })

  it("accepts baixa priority", () => {
    const p: InsightPriority = "baixa"
    expect(p).toBe("baixa")
  })
})

describe("RecommendationData type structure", () => {
  it("accepts valid recommendation data", () => {
    const rec: RecommendationData = baseRecommendation
    expect(rec.action).toBeTruthy()
    expect(rec.reason).toBeTruthy()
  })

  it("allows empty reason", () => {
    const rec: RecommendationData = { action: "Teste", reason: "" }
    expect(rec.action).toBe("Teste")
  })
})

describe("backward compatibility — old module re-exports", () => {
  it("marketplace still exports MarketplaceExecutiveInsight", async () => {
    const mod = await import("@/features/marketplace/components/marketplace-executive-insight")
    expect(typeof mod.MarketplaceExecutiveInsight).toBe("function")
    expect(mod.MarketplaceExecutiveInsight).toBe(ExecutiveInsightCard)
  })

  it("marketplace still exports MarketplaceRecommendation", async () => {
    const mod = await import("@/features/marketplace/components/marketplace-recommendation")
    expect(typeof mod.MarketplaceRecommendation).toBe("function")
    expect(mod.MarketplaceRecommendation).toBe(ExecutiveRecommendationCard)
  })

  it("old MarketplaceExecutiveInsight is the same function as ExecutiveInsightCard", async () => {
    const mod = await import("@/features/marketplace/components/marketplace-executive-insight")
    expect(mod.MarketplaceExecutiveInsight).toBe(ExecutiveInsightCard)
  })

  it("old MarketplaceRecommendation is the same function as ExecutiveRecommendationCard", async () => {
    const mod = await import("@/features/marketplace/components/marketplace-recommendation")
    expect(mod.MarketplaceRecommendation).toBe(ExecutiveRecommendationCard)
  })
})
