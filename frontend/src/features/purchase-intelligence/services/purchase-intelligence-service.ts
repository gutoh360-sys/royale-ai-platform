import type { InventoryAnalysis } from "@/features/inventory-intelligence/types"
import type { PurchaseRecommendation, PurchaseSummary, PurchaseRiskLevel, ProductPurchaseData } from "@/features/purchase-intelligence/types"
import {
  calculateInvestment,
  calculateRevenueProtection,
  calculateMarginProtection,
  calculateSafeOrderDate,
  calculateRecommendedOrderDate,
} from "@/features/purchase-intelligence/calculators"
import { evaluateUrgency, evaluateRiskLevel, evaluatePriority } from "@/features/purchase-intelligence/evaluators"

export interface PurchaseIntelligenceService {
  analyze(analyses: InventoryAnalysis[], productData?: Record<string, ProductPurchaseData>): { recommendations: PurchaseRecommendation[]; summary: PurchaseSummary }
}

export class DefaultPurchaseIntelligenceService implements PurchaseIntelligenceService {
  analyze(analyses: InventoryAnalysis[], productData?: Record<string, ProductPurchaseData>): { recommendations: PurchaseRecommendation[]; summary: PurchaseSummary } {
    const recommendations = analyses
      .filter((a) => a.stockStatus !== "inactive" && a.suggestedPurchaseQuantity > 0)
      .map((a) => this.buildRecommendation(a, productData?.[a.productId]))

    recommendations.sort((a, b) => b.priority - a.priority)

    const summary = this.buildSummary(recommendations)

    return { recommendations, summary }
  }

  private buildRecommendation(a: InventoryAnalysis, pData?: ProductPurchaseData): PurchaseRecommendation {
    const leadTime = pData?.leadTimeDays ?? 7
    const dailySales = pData?.averageDailySales ?? 0
    const salePrice = pData?.salePrice ?? a.cost * 2

    const urgency = evaluateUrgency(a.stockCoverageDays, leadTime, a.suggestedPurchaseQuantity, a.cost)
    const riskLevel = evaluateRiskLevel(a.stockCoverageDays, leadTime, a.stockStatus)
    const priority = evaluatePriority(a.grossMarginPercentage, dailySales, riskLevel)

    return {
      id: `purchase-${a.productId}`,
      sku: a.sku,
      productName: a.productName,
      recommendedQuantity: a.suggestedPurchaseQuantity,
      currentStock: a.availableStock,
      projectedStock: a.projectedStockAfterLeadTime,
      coverageDays: a.stockCoverageDays,
      leadTimeDays: leadTime,
      estimatedInvestment: calculateInvestment(a.suggestedPurchaseQuantity, a.cost),
      estimatedRevenueProtection: calculateRevenueProtection(a.suggestedPurchaseQuantity, salePrice, dailySales),
      estimatedMarginProtection: calculateMarginProtection(a.suggestedPurchaseQuantity, salePrice, a.cost, dailySales),
      urgency,
      priority,
      riskLevel,
      recommendedOrderDate: calculateRecommendedOrderDate(leadTime, a.stockCoverageDays),
      latestSafeOrderDate: calculateSafeOrderDate(leadTime, a.stockCoverageDays),
      reason: this.generateReason(a, urgency, riskLevel, leadTime, dailySales),
    }
  }

  private generateReason(a: InventoryAnalysis, urgency: string, riskLevel: string, leadTime: number, dailySales: number): string {
    if (urgency === "immediate") return `Estoque insuficiente para cobrir o lead time de ${leadTime} dias.`
    if (riskLevel === "critical" || riskLevel === "high") return `Risco de ruptura elevado com cobertura de ${a.stockCoverageDays ?? "?"} dias.`
    if (a.grossMarginPercentage !== null && a.grossMarginPercentage >= 40) return `Produto de alta margem (${a.grossMarginPercentage}%) com reposição programada.`
    return `Reposição baseada na demanda média de ${dailySales.toFixed(1)} unidades/dia.`
  }

  private buildSummary(recs: PurchaseRecommendation[]): PurchaseSummary {
    const coverageDays = recs.map((r) => r.coverageDays).filter((d): d is number => d !== null)
    const riskOrder: PurchaseRiskLevel[] = ["critical", "high", "medium", "low"]
    const highestRisk: PurchaseRiskLevel =
      recs.reduce((max, r) => (riskOrder.indexOf(r.riskLevel) < riskOrder.indexOf(max) ? r.riskLevel : max), "low" as PurchaseRiskLevel)

    return {
      totalProducts: recs.length,
      criticalProducts: recs.filter((r) => r.riskLevel === "critical" || r.riskLevel === "high").length,
      recommendedInvestment: recs.reduce((s, r) => s + r.estimatedInvestment, 0),
      estimatedProtectedRevenue: recs.reduce((s, r) => s + r.estimatedRevenueProtection, 0),
      estimatedProtectedMargin: recs.reduce((s, r) => s + r.estimatedMarginProtection, 0),
      averageCoverage: coverageDays.length > 0 ? Math.round(coverageDays.reduce((s, d) => s + d, 0) / coverageDays.length) : null,
      highestRisk,
    }
  }
}
