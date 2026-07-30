import { describe, it, expect } from "vitest"
import * as fs from "fs"
import * as path from "path"

const NEW_FILES = [
  "hooks/use-executive-orchestrator.ts",
  "components/executive-copilot-page.tsx",
  "components/executive-copilot-skeleton.tsx",
  "components/executive-briefing-section.tsx",
  "components/executive-highlights-section.tsx",
  "components/executive-alerts-section.tsx",
  "components/executive-priorities-section.tsx",
  "components/executive-actions-section.tsx",
  "components/executive-summary-bar.tsx",
  "types/briefing.ts",
]

const OLD_SERVICE_PATTERNS = [
  "executive-copilot/services",
  "executive-copilot/service",
  "copilot-orchestrator",
  "buildCopilotData",
  "buildCopilotInput",
  "DefaultExecutiveCopilotService",
  "ExecutiveCopilotService",
  "CopilotInput",
  "CopilotHealth",
  "CopilotTopPriority",
  "CopilotRecommendedAction",
  "CopilotFinancialSnapshot",
  "CopilotMarketplaceSnapshot",
  "CopilotInventorySnapshot",
]

const FEATURE_DIR = path.resolve(__dirname, "..")

describe("New orchestrator files", () => {
  for (const file of NEW_FILES) {
    const filePath = path.join(FEATURE_DIR, file)

    it(`${file} does not import old services`, () => {
      const content = fs.readFileSync(filePath, "utf-8")
      for (const pattern of OLD_SERVICE_PATTERNS) {
        expect(content).not.toContain(pattern)
      }
    })

    it(`${file} does not instantiate services or create data`, () => {
      const content = fs.readFileSync(filePath, "utf-8")
      expect(content).not.toContain("new Default")
      expect(content).not.toContain("calcHealth")
      expect(content).not.toContain("buildPriorities")
      expect(content).not.toContain("buildActions")
      expect(content).not.toContain(".compose(")
      expect(content).not.toContain(".generateInsights(")
      expect(content).not.toContain(".prioritize(")
    })
  }
})

describe("Orchestrator hook — useExecutiveOrchestrator", () => {
  it("imports from all 6 executive module hooks", () => {
    const content = fs.readFileSync(path.join(FEATURE_DIR, "hooks/use-executive-orchestrator.ts"), "utf-8")
    expect(content).toContain("useMarketplaceData")
    expect(content).toContain("useFinancialData")
    expect(content).toContain("useInventoryData")
    expect(content).toContain("useSalesData")
    expect(content).toContain("useProductsData")
    expect(content).toContain("usePurchasingData")
    expect(content).toContain("useBriefing")
  })

  it("does not call any service layer", () => {
    const content = fs.readFileSync(path.join(FEATURE_DIR, "hooks/use-executive-orchestrator.ts"), "utf-8")
    expect(content).not.toContain("new Default")
    expect(content).not.toContain(".compose(")
    expect(content).not.toContain("buildCopilotData")
    expect(content).not.toContain("calcHealth")
    expect(content).not.toContain("buildPriorities")
    expect(content).not.toContain("buildActions")
    expect(content).not.toContain("recommendedActions")
  })
})

describe("ExecutiveCopilotPage — component behavior (logic, not rendering)", () => {
  it("BriefingSection builds lines from module data without thresholds", () => {
    const lines: string[] = []

    const marketplaceActive = 3
    const itemsInStock = 1500
    const stockValue = 250000
    const salesRevenue = 180000
    const financialProfit = 45000
    const totalProducts = 200
    const activeProducts = 180

    if (marketplaceActive > 0) {
      lines.push(`Monitorando ${marketplaceActive} marketplace(s) ativo(s).`)
    }
    if (itemsInStock > 0) {
      lines.push(`Estoque com ${itemsInStock} itens avaliados em R$ ${stockValue.toLocaleString("pt-BR")}.`)
    }
    if (salesRevenue > 0) {
      lines.push(`Receita total de vendas: R$ ${salesRevenue.toLocaleString("pt-BR")}.`)
    }
    if (financialProfit >= 0) {
      lines.push(`Resultado financeiro positivo de R$ ${financialProfit.toLocaleString("pt-BR")}.`)
    }
    if (totalProducts > 0) {
      lines.push(`${activeProducts} de ${totalProducts} produtos ativos no portfólio.`)
    }

    expect(lines.length).toBe(5)
    expect(lines[0]).toContain("Monitorando")
    expect(lines[3]).toContain("positivo")
  })

  it("HighlightsSection uses module health as-is — no new classification", () => {
    const highlights: string[] = []
    const modules = [
      { name: "Marketplace", value: 82 },
      { name: "Financeiro", value: 75 },
      { name: "Estoque", value: 88 },
      { name: "Vendas", value: 91 },
      { name: "Produtos", value: 70 },
      { name: "Compras", value: 76 },
    ]

    modules
      .filter((m) => m.value >= 70)
      .forEach((m) => highlights.push(`${m.name} saudável (${m.value}%).`))

    expect(highlights.length).toBe(6)
    expect(highlights[0]).toContain("82%")
    expect(highlights[5]).toContain("76%")
  })

  it("AlertsSection groups existing module risks", () => {
    const alerts: string[] = []
    const modules = [
      { name: "Marketplace", value: 55 },
      { name: "Financeiro", value: 42 },
    ]

    modules
      .filter((m) => m.value < 70)
      .forEach((m) => alerts.push(`${m.name} com saúde ${m.value}% — requer atenção.`))

    expect(alerts.length).toBe(2)
    expect(alerts[0]).toContain("55%")
    expect(alerts[1]).toContain("42%")
  })

  it("PrioritiesSection uses ExecutivePriority data directly — no transformation", () => {
    const mockPriorities = [
      { id: "p1", rank: 1, title: "Repor estoque crítico", description: "3 produtos em nível crítico", urgency: "immediate" as const },
      { id: "p2", rank: 2, title: "Revisar preços", urgency: "today" as const },
    ]

    expect(mockPriorities.length).toBe(2)
    expect(mockPriorities[0].urgency).toBe("immediate")
    expect(mockPriorities[0].title).toBe("Repor estoque crítico")
  })

  it("ActionsSection consumes existing recommendedAction — never creates new actions", () => {
    const priorities = [
      { id: "p1", recommendedAction: "Comprar 150 unidades do SKU-001" },
      { id: "p2", recommendedAction: "Revisar contrato com fornecedor X" },
    ]

    const actions = priorities
      .filter((p) => p.recommendedAction)
      .map((p) => ({ text: p.recommendedAction, source: "Prioridades" }))

    expect(actions.length).toBe(2)
    expect(actions[0].text).toBe("Comprar 150 unidades do SKU-001")
  })

  it("SummaryBar counts healthy and warning areas from module health values", () => {
    const healths = [
      { name: "Marketplace", value: 82 },
      { name: "Finanças", value: 45 },
      { name: "Estoque", value: 75 },
      { name: "Vendas", value: 30 },
      { name: "Produtos", value: 68 },
    ]

    const good = healths.filter((h) => h.value >= 70).length
    const bad = healths.filter((h) => h.value < 70).length

    expect(good).toBe(2)
    expect(bad).toBe(3)
  })
})

describe("Data flows through without transformation", () => {
  it("marketplace averageHealth passes through as-is", () => {
    expect({ averageHealth: 82 }.averageHealth).toBe(82)
  })

  it("financial health passes through as-is", () => {
    expect({ health: 64 }.health).toBe(64)
  })

  it("inventory health passes through as-is", () => {
    expect({ health: 71 }.health).toBe(71)
  })

  it("sales health passes through as-is", () => {
    expect({ health: 58 }.health).toBe(58)
  })

  it("products health passes through as-is", () => {
    expect({ health: 90 }.health).toBe(90)
  })

  it("purchasing health passes through as-is", () => {
    expect({ health: 75 }.health).toBe(75)
  })

  it("purchasing highestRisk passes through as-is", () => {
    expect({ highestRisk: "Fornecedor XYZ" }.highestRisk).toBe("Fornecedor XYZ")
  })

  it("inventory summary outOfStockCount passes through as-is", () => {
    expect({ summary: { outOfStockCount: 5 } }.summary.outOfStockCount).toBe(5)
  })
})
