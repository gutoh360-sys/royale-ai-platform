import { describe, it, expect } from "vitest"
import * as fs from "fs"
import * as path from "path"
import {
  ExecutiveInsightStatus,
  ExecutiveInsightSeverity,
  ExecutiveInsightCategory,
} from "@/features/executive-insights/types"
import type { ExecutiveInsight, InsightKey } from "@/features/executive-insights/domain"
import type { ExecutiveInsightRepository } from "@/features/executive-insights/repository"
import type { ExecutiveInsightBuilder } from "@/features/executive-insights/builders"
import type { ExecutiveInsightProvider } from "@/features/executive-insights/contracts"

const FEATURE_DIR = path.resolve(__dirname, "..")

describe("ExecutiveInsight Platform — architecture only", () => {
  it("has no concrete implementations in the module", () => {
    const files = [
      "domain/executive-insight.ts",
      "types/enums.ts",
      "repository/executive-insight-repository.ts",
      "builders/executive-insight-builder.ts",
      "contracts/executive-insight-provider.ts",
    ]
    for (const file of files) {
      const content = fs.readFileSync(path.join(FEATURE_DIR, file), "utf-8")
      expect(content).not.toContain("class ")
      expect(content).not.toContain("new ")
    }
  })

  it("does not import any engine or existing feature", () => {
    const files = [
      "domain/executive-insight.ts",
      "types/enums.ts",
      "repository/executive-insight-repository.ts",
      "builders/executive-insight-builder.ts",
      "contracts/executive-insight-provider.ts",
      "index.ts",
    ]
    for (const file of files) {
      const content = fs.readFileSync(path.join(FEATURE_DIR, file), "utf-8")
      const importPattern = /from\s+["']@\/features\/(?!executive-insights)/g
      const matches = content.match(importPattern)
      if (matches) {
        expect(matches.length).toBe(0)
      }
    }
  })

  it("exports all types from root index", async () => {
    const mod = await import("@/features/executive-insights")
    expect(mod.ExecutiveInsightStatus).toBeDefined()
    expect(mod.ExecutiveInsightSeverity).toBeDefined()
    expect(mod.ExecutiveInsightCategory).toBeDefined()
  })
})

describe("ExecutiveInsightStatus", () => {
  it("has exactly 4 statuses", () => {
    const values = Object.values(ExecutiveInsightStatus)
    expect(values).toHaveLength(4)
    expect(values).toContain("NEW")
    expect(values).toContain("ACTIVE")
    expect(values).toContain("RESOLVED")
    expect(values).toContain("ARCHIVED")
  })
})

describe("ExecutiveInsightSeverity", () => {
  it("has exactly 4 severities", () => {
    const values = Object.values(ExecutiveInsightSeverity)
    expect(values).toHaveLength(4)
    expect(values).toContain("INFO")
    expect(values).toContain("POSITIVE")
    expect(values).toContain("WARNING")
    expect(values).toContain("CRITICAL")
  })
})

describe("ExecutiveInsightCategory", () => {
  it("has exactly 7 categories", () => {
    const values = Object.values(ExecutiveInsightCategory)
    expect(values).toHaveLength(7)
    expect(values).toContain("MARKETPLACE")
    expect(values).toContain("FINANCIAL")
    expect(values).toContain("INVENTORY")
    expect(values).toContain("SALES")
    expect(values).toContain("PRODUCTS")
    expect(values).toContain("PURCHASING")
    expect(values).toContain("GLOBAL")
  })
})

describe("ExecutiveInsight — domain entity", () => {
  it("accepts valid insight data", () => {
    const refDate = new Date("2026-07-30")
    const insight: ExecutiveInsight = {
      key: "inventory:insight:ruptura-de-estoque-iminente" as InsightKey,
      id: "insight-001",
      module: "inventory",
      category: "INVENTORY",
      severity: "WARNING",
      status: "ACTIVE",
      priority: 85,
      title: "Ruptura de estoque iminente",
      summary: "3 produtos com estoque crítico",
      fact: "SKU-001 tem 0 unidades em estoque",
      context: "Vendas aumentaram 30% no último mês",
      impact: "Risco de perda de receita de R$ 50.000",
      recommendation: "Comprar 150 unidades urgentemente",
      evidence: { source: "inventory", metric: "stockCount", value: 0 },
      relatedInsights: [],
      metadata: {},
      version: 1,
      firstDetectedAt: refDate,
      lastDetectedAt: refDate,
      occurrenceCount: 1,
      lastEvaluationRun: "run-001",
      createdAt: refDate,
      updatedAt: refDate,
      resolvedAt: null,
      archivedAt: null,
    }
    expect(insight.key).toBe("inventory:insight:ruptura-de-estoque-iminente")
    expect(insight.id).toBe("insight-001")
    expect(insight.category).toBe("INVENTORY")
    expect(insight.severity).toBe("WARNING")
    expect(insight.status).toBe("ACTIVE")
    expect(insight.priority).toBe(85)
    expect(insight.version).toBe(1)
    expect(insight.firstDetectedAt).toBeInstanceOf(Date)
    expect(insight.lastDetectedAt).toBeInstanceOf(Date)
    expect(insight.occurrenceCount).toBe(1)
    expect(insight.lastEvaluationRun).toBe("run-001")
    expect(insight.createdAt).toBeInstanceOf(Date)
    expect(insight.resolvedAt).toBeNull()
    expect(insight.archivedAt).toBeNull()
  })

  it("accepts resolvedAt as Date", () => {
    const insight: ExecutiveInsight = {
      key: "marketplace:insight:crescimento-de-marketplace" as InsightKey,
      id: "insight-002",
      module: "marketplace",
      category: "MARKETPLACE",
      severity: "POSITIVE",
      status: "RESOLVED",
      priority: 30,
      title: "Crescimento de marketplace",
      summary: "Shopee cresceu 15%",
      fact: "Receita aumentou R$ 20.000",
      context: "Sem mudanças operacionais",
      impact: "Expansão de market share",
      recommendation: "Manter estratégia atual",
      evidence: { source: "marketplace", metric: "growth", value: 15 },
      relatedInsights: [],
      metadata: {},
      version: 1,
      firstDetectedAt: new Date("2026-07-01"),
      lastDetectedAt: new Date("2026-07-15"),
      occurrenceCount: 1,
      lastEvaluationRun: "run-001",
      createdAt: new Date("2026-07-01"),
      updatedAt: new Date("2026-07-15"),
      resolvedAt: new Date("2026-07-15"),
      archivedAt: null,
    }
    expect(insight.resolvedAt).toBeInstanceOf(Date)
  })

  it("allows relatedInsights linking", () => {
    const now = new Date()
    const insight: ExecutiveInsight = {
      key: "sales:insight:queda-de-vendas" as InsightKey,
      id: "insight-003",
      module: "sales",
      category: "SALES",
      severity: "CRITICAL",
      status: "ACTIVE",
      priority: 95,
      title: "Queda de vendas",
      summary: "Vendas caíram 40%",
      fact: "Faturamento de R$ 100.000 para R$ 60.000",
      context: "Alta concorrência",
      impact: "Perda de participação de mercado",
      recommendation: "Revisar estratégia de precificação",
      evidence: { source: "sales", metric: "drop", value: 0.4 },
      relatedInsights: ["insight-001"],
      metadata: {},
      version: 1,
      firstDetectedAt: now,
      lastDetectedAt: now,
      occurrenceCount: 1,
      lastEvaluationRun: "run-001",
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
      archivedAt: null,
    }
    expect(insight.relatedInsights).toContain("insight-001")
  })

  it("allows generic metadata", () => {
    const now = new Date()
    const insight: ExecutiveInsight = {
      key: "purchasing:insight:compra-programada" as InsightKey,
      id: "insight-004",
      module: "purchasing",
      category: "PURCHASING",
      severity: "INFO",
      status: "NEW",
      priority: 20,
      title: "Compra programada",
      summary: "Fornecedor X tem lead time de 30 dias",
      fact: "Prazo de entrega atual: 30 dias",
      context: "Demanda estável",
      impact: "Baixo risco",
      recommendation: "Manter cronograma",
      evidence: { source: "purchasing", entityId: "supplier-X" },
      relatedInsights: [],
      metadata: { source: "purchase-intelligence", version: "1.0", category: "electronics" },
      version: 1,
      firstDetectedAt: now,
      lastDetectedAt: now,
      occurrenceCount: 1,
      lastEvaluationRun: "run-001",
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
      archivedAt: null,
    }
    expect(insight.metadata.source).toBe("purchase-intelligence")
    expect(insight.metadata.version).toBe("1.0")
  })
})

describe("ExecutiveInsightRepository — contract", () => {
  it("has 10 methods for CRUD and lifecycle", () => {
    const methods: (keyof ExecutiveInsightRepository)[] = [
      "save", "find", "findByKey", "findByModule",
      "findActive", "archive", "reopen",
      "update", "findAll", "findByStatus",
    ]
    expect(methods.length).toBe(10)
  })
})

describe("ExecutiveInsightBuilder — contract", () => {
  it("is a type-only interface with build method", () => {
    const methods: (keyof ExecutiveInsightBuilder<unknown>)[] = ["build"]
    expect(methods.length).toBe(1)
  })
})

describe("ExecutiveInsightProvider — contract", () => {
  it("is a type-only interface with provide method", () => {
    const methods: (keyof ExecutiveInsightProvider)[] = ["provide"]
    expect(methods.length).toBe(1)
  })
})

describe("No behavioral code", () => {
  it("does not instantiate any engine", () => {
    const modules = ["domain/executive-insight.ts", "types/enums.ts"]
    for (const mod of modules) {
      const content = fs.readFileSync(path.join(FEATURE_DIR, mod), "utf-8")
      expect(content).not.toContain("class ")
      expect(content).not.toContain("Default")
      expect(content).not.toContain("implements ")
    }
  })

  it("has no scheduler, cron, or background references", () => {
    const files = fs.readdirSync(FEATURE_DIR, { recursive: true }) as string[]
    const tsFiles = files.filter((f: string) => f.endsWith(".ts") && !f.startsWith("tests"))
    for (const file of tsFiles) {
      const content = fs.readFileSync(path.join(FEATURE_DIR, file), "utf-8")
      expect(content).not.toMatch(/scheduler|cron|background|setInterval|setTimeout|SQLite|Redis|PostgreSQL|OpenAI|Claude|Gemini/i)
    }
  })

  it("has no database references", () => {
    const files = fs.readdirSync(FEATURE_DIR, { recursive: true }) as string[]
    const tsFiles = files.filter((f: string) => f.endsWith(".ts") && !f.startsWith("tests"))
    for (const file of tsFiles) {
      const content = fs.readFileSync(path.join(FEATURE_DIR, file), "utf-8")
      expect(content).not.toMatch(/createTable|insert into|select.*from|sqlite|prisma|drizzle/i)
    }
  })
})
