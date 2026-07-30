import type { InventoryAnalysis } from "@/features/inventory-intelligence/types"
import type { SalesOpportunity } from "@/features/sales-intelligence/types"
import type { FinancialInsight, FinancialSummary, FinancialInput, FinancialRisk } from "@/features/financial-intelligence/types"
import {
  calculateROI, calculatePayback, calculateGrossMargin, calculateIdleCapital,
  calculateWorkingCapitalImpact, calculateFinancialHealthScore,
} from "@/features/financial-intelligence/calculators"
import { evaluateFinancialRisk, evaluateRecommendation, evaluateConfidence } from "@/features/financial-intelligence/evaluators"

export interface FinancialIntelligenceService {
  analyze(input: FinancialInput): { insights: FinancialInsight[]; summary: FinancialSummary }
}

export class DefaultFinancialIntelligenceService implements FinancialIntelligenceService {
  analyze(input: FinancialInput): { insights: FinancialInsight[]; summary: FinancialSummary } {
    const salesByProductId = new Map<string, SalesOpportunity>()
    for (const s of input.salesOpportunities) {
      salesByProductId.set(s.sku, s)
    }

    const insights: FinancialInsight[] = []
    for (const inv of input.inventory) {
      if (inv.stockStatus === "inactive") continue
      if (inv.cost <= 0) continue

      const insight = this.buildInsight(inv, salesByProductId)
      insights.push(insight)
    }

    insights.sort((a, b) => {
      const riskOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      const diff = riskOrder[b.financialRisk] - riskOrder[a.financialRisk]
      if (diff !== 0) return diff
      return b.priority - a.priority
    })

    const summary = this.buildSummary(insights)
    return { insights, summary }
  }

  private buildInsight(inv: InventoryAnalysis, salesByProductId: Map<string, SalesOpportunity>): FinancialInsight {
    const sale = salesByProductId.get(inv.sku)
    const revenue = sale?.currentRevenue ?? 0
    const monthlyProfit = revenue - inv.cost * (sale?.currentOrders ?? 0)
    const estimatedProfit = calculateGrossMargin(revenue, inv.cost * (sale?.currentOrders ?? 0))
    const roi = calculateROI(revenue, inv.cost * (inv.availableStock > 0 ? Math.ceil(inv.availableStock / 30) : 1))
    const paybackDays = calculatePayback(inv.cost * 10, monthlyProfit > 0 ? monthlyProfit : revenue * 0.1)
    const idleCapital = calculateIdleCapital(inv.availableStock, inv.cost, inv.stockCoverageDays)
    const inventoryValue = inv.availableStock * inv.cost
    const workingCapitalImpact = calculateWorkingCapitalImpact(inventoryValue, idleCapital, revenue)
    const risk = evaluateFinancialRisk(inv.grossMarginPercentage, roi, idleCapital, inventoryValue, inv.stockCoverageDays)
    const recommendation = evaluateRecommendation(inv.grossMarginPercentage, roi, idleCapital, inventoryValue, inv.stockCoverageDays)
    const confidence = evaluateConfidence(roi, revenue, inv.grossMarginPercentage)
    const priority = this.calcPriority(risk, roi)
    const reason = this.buildReason(recommendation, inv, roi, idleCapital)
    const category = sale?.category ?? "Sem categoria"

    return {
      id: `fin-${inv.productId}`,
      productId: inv.productId,
      sku: inv.sku,
      productName: inv.productName,
      category,
      currentRevenue: revenue,
      estimatedProfit,
      grossMargin: inv.grossMargin,
      grossMarginPercentage: inv.grossMarginPercentage,
      inventoryValue,
      idleCapital,
      financialRisk: risk,
      roi,
      paybackDays,
      workingCapitalImpact,
      priority,
      recommendation,
      reason,
      confidence,
    }
  }

  private calcPriority(risk: FinancialRisk, roi: number): number {
    const riskBase = { critical: 40, high: 30, medium: 20, low: 10 }
    const roiBonus = Math.max(0, Math.min(roi, 50))
    return riskBase[risk] + roiBonus
  }

  private buildReason(rec: string, inv: InventoryAnalysis, roi: number, idleCapital: number): string {
    switch (rec) {
      case "increase_investment":
        return `Margem de ${(inv.grossMarginPercentage ?? 0).toFixed(0)}% com ROI de ${roi}%. Potencial para escalar.`
      case "reduce_inventory":
        return `Capital parado de R$ ${idleCapital.toLocaleString("pt-BR")} em ${inv.productName}. Reduzir estoque.`
      case "improve_margin":
        return `Margem baixa (${(inv.grossMarginPercentage ?? 0).toFixed(0)}%). Revisar custos ou preço.`
      default:
        return `Indicadores financeiros estáveis. Nenhuma intervenção urgente.`
    }
  }

  private buildSummary(insights: FinancialInsight[]): FinancialSummary {
    const total = insights.length
    if (total === 0) return {
      productsAnalyzed: 0, totalRevenue: 0, estimatedGrossProfit: 0, averageMargin: null,
      idleCapital: 0, workingCapital: 0, highRiskProducts: 0, averageROI: 0, averagePayback: 0, financialHealthScore: 0,
    }

    const totalRevenue = insights.reduce((s, i) => s + i.currentRevenue, 0)
    const totalProfit = insights.reduce((s, i) => s + i.estimatedProfit, 0)
    const totalIdle = insights.reduce((s, i) => s + i.idleCapital, 0)
    const totalWorkingCapital = insights.reduce((s, i) => s + i.workingCapitalImpact, 0)
    const highRisk = insights.filter((i) => i.financialRisk === "high" || i.financialRisk === "critical").length
    const avgROI = Math.round(insights.reduce((s, i) => s + i.roi, 0) / total)
    const avgPayback = Math.round(insights.reduce((s, i) => s + i.paybackDays, 0) / total)
    const margins = insights.filter((i) => i.grossMarginPercentage !== null).map((i) => i.grossMarginPercentage as number)
    const avgMargin = margins.length > 0 ? margins.reduce((s, m) => s + m, 0) / margins.length : null
    const avgMarginDecimal = avgMargin !== null ? avgMargin / 100 : null
    const healthScore = calculateFinancialHealthScore(
      avgMarginDecimal, avgROI, avgPayback, total > 0 ? highRisk / total : 0, totalRevenue > 0 ? totalIdle / (totalRevenue * 2) : 0,
    )

    return {
      productsAnalyzed: total,
      totalRevenue,
      estimatedGrossProfit: totalProfit,
      averageMargin: avgMargin !== null ? Math.round(avgMargin * 10) / 10 : null,
      idleCapital: totalIdle,
      workingCapital: totalWorkingCapital,
      highRiskProducts: highRisk,
      averageROI: avgROI,
      averagePayback: avgPayback,
      financialHealthScore: healthScore,
    }
  }
}
