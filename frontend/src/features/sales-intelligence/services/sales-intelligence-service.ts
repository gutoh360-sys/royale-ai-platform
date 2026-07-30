import type { InventoryAnalysis } from "@/features/inventory-intelligence/types"
import type { MarketplaceSummary, ProductPerformance, SalesOpportunity, SalesSummary, SalesInput } from "@/features/sales-intelligence/types"
import {
  calculateConversionScore, calculateStockAvailability, calculateSalesOpportunityScore,
} from "@/features/sales-intelligence/calculators"
import { evaluateOpportunityType, evaluatePriority, evaluateConfidence } from "@/features/sales-intelligence/evaluators"
import { REVENUE_GAIN_MULTIPLIER, MARGIN_GAIN_MULTIPLIER } from "@/features/sales-intelligence/constants"

export interface SalesIntelligenceService {
  analyze(input: SalesInput): { opportunities: SalesOpportunity[]; summary: SalesSummary }
}

export class DefaultSalesIntelligenceService implements SalesIntelligenceService {
  analyze(input: SalesInput): { opportunities: SalesOpportunity[]; summary: SalesSummary } {
    const inventoryByProductId = new Map<string, InventoryAnalysis>()
    for (const inv of input.inventory) {
      inventoryByProductId.set(inv.productId, inv)
    }

    const opportunities: SalesOpportunity[] = []
    for (const perf of input.products) {
      const inventory = inventoryByProductId.get(perf.productId)
      if (!inventory || inventory.stockStatus === "inactive") continue
      if (perf.views <= 0 && perf.revenue <= 0) continue

      const opportunity = this.buildOpportunity(perf, inventory, input.market)
      opportunities.push(opportunity)
    }

    opportunities.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      const diff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (diff !== 0) return diff
      return b.confidence - a.confidence
    })

    const summary = this.buildSummary(opportunities)
    return { opportunities, summary }
  }

  private buildOpportunity(
    perf: ProductPerformance,
    inv: InventoryAnalysis,
    market: MarketplaceSummary,
  ): SalesOpportunity {
    // market data reserved for future growth-based calculations
    void market
    const conversionScore = calculateConversionScore(perf.conversionRate, perf.views)
    const stockAvail = calculateStockAvailability(inv.availableStock, inv.stockCoverageDays)
    const opportunityScore = calculateSalesOpportunityScore(
      conversionScore, perf.marginPercentage, stockAvail, perf.views, perf.revenue,
    )
    const opportunityType = evaluateOpportunityType(
      perf.conversionRate, perf.views, inv.stockCoverageDays, perf.marginPercentage, inv.availableStock,
    )
    const confidence = evaluateConfidence(perf.conversionRate, perf.views, stockAvail)
    const effectiveRevenue = perf.revenue || 1
    const estimatedRevenueGain = Math.round(effectiveRevenue * REVENUE_GAIN_MULTIPLIER * confidence)
    const estimatedMarginGain = Math.round(estimatedRevenueGain * (perf.marginPercentage / 100) * MARGIN_GAIN_MULTIPLIER)
    const priority = evaluatePriority(opportunityScore)

    return {
      id: `sales-opp-${perf.productId}`,
      sku: perf.sku,
      productName: perf.productName,
      category: perf.category,
      currentRevenue: perf.revenue,
      currentOrders: perf.orders,
      conversionRate: perf.conversionRate,
      views: perf.views,
      availableStock: inv.availableStock,
      coverageDays: inv.stockCoverageDays,
      priority,
      opportunityType,
      estimatedRevenueGain,
      estimatedMarginGain,
      recommendedAction: this.buildAction(opportunityType),
      reason: this.buildReason(opportunityType, perf, inv),
      confidence,
    }
  }

  private buildAction(type: string): string {
    const actions: Record<string, string> = {
      increase_ads: "Aumentar investimento em anúncios",
      improve_listing: "Otimizar página do produto",
      replenish_stock: "Reabastecer estoque",
      review_price: "Revisar preço",
      monitor: "Monitorar desempenho",
    }
    return actions[type] ?? "Monitorar desempenho"
  }

  private buildReason(
    type: string,
    perf: ProductPerformance,
    inv: InventoryAnalysis,
  ): string {
    switch (type) {
      case "increase_ads":
        return `Produto de alta margem (${perf.marginPercentage.toFixed(0)}%) com boa conversão (${(perf.conversionRate * 100).toFixed(1)}%) e estoque disponível.`
      case "improve_listing":
        return `Muitas visualizações (${perf.views}) mas baixa conversão (${(perf.conversionRate * 100).toFixed(1)}%). Revisar imagens, título e descrição.`
      case "replenish_stock":
        return `Alta conversão (${(perf.conversionRate * 100).toFixed(1)}%) com estoque baixo (${inv.availableStock} unidades). Risco de ruptura.`
      case "review_price":
        return `Estoque elevado (${inv.availableStock} unidades) com baixa conversão (${(perf.conversionRate * 100).toFixed(1)}%). Avaliar redução de preço.`
      default:
        return `Desempenho estável. Nenhuma ação urgente necessária.`
    }
  }

  private buildSummary(opportunities: SalesOpportunity[]): SalesSummary {
    const total = opportunities.length
    if (total === 0) {
      return {
        productsAnalyzed: 0,
        highOpportunities: 0,
        criticalProducts: 0,
        estimatedRevenuePotential: 0,
        estimatedMarginPotential: 0,
        averageConversion: 0,
        averageStockCoverage: null,
      }
    }

    const highOpportunities = opportunities.filter((o) => o.priority === "high" || o.priority === "critical").length
    const criticalProducts = opportunities.filter((o) => o.priority === "critical").length
    const totalRevenueGain = opportunities.reduce((s, o) => s + o.estimatedRevenueGain, 0)
    const totalMarginGain = opportunities.reduce((s, o) => s + o.estimatedMarginGain, 0)
    const avgConversion = opportunities.reduce((s, o) => s + o.conversionRate, 0) / total
    const coverages = opportunities.filter((o) => o.coverageDays !== null).map((o) => o.coverageDays as number)
    const avgCoverage = coverages.length > 0 ? coverages.reduce((s, c) => s + c, 0) / coverages.length : null

    return {
      productsAnalyzed: total,
      highOpportunities,
      criticalProducts,
      estimatedRevenuePotential: totalRevenueGain,
      estimatedMarginPotential: totalMarginGain,
      averageConversion: Math.round(avgConversion * 10000) / 10000,
      averageStockCoverage: avgCoverage !== null ? Math.round(avgCoverage * 10) / 10 : null,
    }
  }
}
