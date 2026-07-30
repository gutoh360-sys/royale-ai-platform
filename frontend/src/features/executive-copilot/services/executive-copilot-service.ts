import type { ExecutiveCopilotData, CopilotTopPriority, CopilotRecommendedAction } from "@/features/executive-copilot/types"
import type { FinancialSummary } from "@/features/financial-intelligence/types"
import type { InventoryIntelligenceSummary } from "@/features/inventory-intelligence/types"
import type { MarketplaceSummaryData } from "@/features/marketplace/types"
import type { SalesSummary } from "@/features/sales-intelligence/types"
import type { PurchaseSummary } from "@/features/purchase-intelligence/types"
import type { ExecutiveInsight } from "@/features/executive-intelligence/types"

export interface ExecutiveCopilotService {
  compose(data: CopilotInput): ExecutiveCopilotData
}

export interface CopilotInput {
  financialSummary: FinancialSummary
  inventorySummary: InventoryIntelligenceSummary
  marketplaceSummary: MarketplaceSummaryData
  salesSummary: SalesSummary
  purchaseSummary: PurchaseSummary
  executiveInsights: ExecutiveInsight[]
  timestamp?: string
}

const hours = new Date().getHours()
const greeting = hours < 12 ? "Bom dia" : hours < 18 ? "Boa tarde" : "Boa noite"

export class DefaultExecutiveCopilotService implements ExecutiveCopilotService {
  compose(data: CopilotInput): ExecutiveCopilotData {
    const health = this.calcHealth(data)
    return {
      timestamp: data.timestamp ?? new Date().toISOString(),
      health: {
        status: health,
        score: data.financialSummary.financialHealthScore,
        message: `${greeting}. Segue o resumo da operação de hoje.`,
      },
      topPriorities: this.buildPriorities(data),
      opportunities: data.salesSummary.highOpportunities,
      financialSnapshot: {
        revenue: data.financialSummary.totalRevenue,
        profit: data.financialSummary.estimatedGrossProfit,
        idleCapital: data.financialSummary.idleCapital,
        averageROI: data.financialSummary.averageROI,
        healthScore: data.financialSummary.financialHealthScore,
      },
      inventorySnapshot: {
        totalProducts: data.inventorySummary.activeProducts,
        outOfStock: data.inventorySummary.outOfStockCount,
        stockoutRisk: data.inventorySummary.stockoutRiskCount,
        overstock: data.inventorySummary.overstockCount,
        idleCapital: data.inventorySummary.idleCapitalValue,
        averageCoverage: data.inventorySummary.averageCoverageDays,
      },
      marketplaceSnapshot: {
        totalRevenue: data.marketplaceSummary.totalRevenue,
        totalOrders: data.marketplaceSummary.totalOrders,
        averageHealth: data.marketplaceSummary.averageHealth,
        averageTicket: data.marketplaceSummary.averageTicket,
      },
      recommendedActions: this.buildActions(data),
    }
  }

  private calcHealth(data: CopilotInput): "healthy" | "attention" | "critical" {
    const score = data.financialSummary.financialHealthScore
    if (score >= 70) return "healthy"
    if (score >= 40) return "attention"
    return "critical"
  }

  private buildPriorities(data: CopilotInput): CopilotTopPriority[] {
    const priorities: CopilotTopPriority[] = []
    if (data.inventorySummary.criticalReplenishmentCount > 0) {
      priorities.push({ title: "Reabastecer produtos críticos", description: `${data.inventorySummary.criticalReplenishmentCount} produtos com estoque insuficiente`, domain: "inventory", severity: "critical" })
    }
    if (data.inventorySummary.idleCapitalValue > 5000) {
      priorities.push({ title: "Capital parado identificado", description: `R$ ${data.inventorySummary.idleCapitalValue.toLocaleString("pt-BR")} em produtos com baixo giro`, domain: "financial", severity: "high" })
    }
    if (data.salesSummary.highOpportunities > 0) {
      priorities.push({ title: "Oportunidade de crescimento", description: `${data.salesSummary.highOpportunities} produtos prontos para campanhas`, domain: "sales", severity: "medium" })
    }
    if (data.purchaseSummary.criticalProducts > 0) {
      priorities.push({ title: "Compras urgentes", description: `${data.purchaseSummary.criticalProducts} produtos necessitam compra imediata`, domain: "inventory", severity: "critical" })
    }
    if (data.financialSummary.highRiskProducts > 0) {
      priorities.push({ title: "Risco financeiro detectado", description: `${data.financialSummary.highRiskProducts} produtos com indicadores críticos`, domain: "financial", severity: "high" })
    }
    if (priorities.length === 0) {
      priorities.push({ title: "Operação estável", description: "Nenhum alerta no momento", domain: "operations", severity: "low" })
    }
    return priorities.slice(0, 5)
  }

  private buildActions(data: CopilotInput): CopilotRecommendedAction[] {
    const actions: CopilotRecommendedAction[] = []
    if (data.purchaseSummary.criticalProducts > 0) {
      actions.push({ type: "purchase", action: "Reabastecer estoque crítico", reason: `${data.purchaseSummary.criticalProducts} produtos com urgência de compra`, priority: "critical" })
    }
    if (data.salesSummary.highOpportunities > 0) {
      actions.push({ type: "sales", action: "Impulsionar produtos de alta margem", reason: `${data.salesSummary.highOpportunities} oportunidades identificadas`, priority: "high" })
    }
    if (data.inventorySummary.overstockCount > 0) {
      actions.push({ type: "inventory", action: "Revisar preços de estoque parado", reason: `${data.inventorySummary.overstockCount} produtos com cobertura excessiva`, priority: "medium" })
    }
    if (data.financialSummary.averageMargin !== null && data.financialSummary.averageMargin < 20) {
      actions.push({ type: "financial", action: "Revisar margem de produtos críticos", reason: "Margem média abaixo do ideal", priority: "medium" })
    }
    return actions
  }
}
