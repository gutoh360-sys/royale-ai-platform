import type { StockProduct, InventoryAnalysis, InventoryIntelligenceSummary } from "@/features/inventory-intelligence/types";
import {
  calculateAvailableStock,
  calculateStockCoverageDays,
  calculateProjectedStockAfterLeadTime,
  calculateSuggestedPurchaseQuantity,
  calculateGrossMargin,
  calculateGrossMarginPercentage,
  calculateDaysSinceLastSale,
} from "@/features/inventory-intelligence/calculators";
import {
  classifyStockStatus,
  classifyAbc,
  calculateReplenishmentScore,
  classifyReplenishmentPriority,
  determineReasons,
} from "@/features/inventory-intelligence/classifiers";

export interface InventoryIntelligenceService {
  analyzeProducts(products: StockProduct[], referenceDate?: Date): InventoryAnalysis[];
  buildSummary(analyses: InventoryAnalysis[], referenceDate?: Date): InventoryIntelligenceSummary;
}

export class DefaultInventoryIntelligenceService implements InventoryIntelligenceService {
  analyzeProducts(products: StockProduct[], referenceDate?: Date): InventoryAnalysis[] {
    const abcMap = classifyAbc(
      products.map((p) => ({
        product: p,
        salesValue: p.salesLast90Days * p.salePrice,
      })),
    );

    return products.map((product) => {
      const availableStock = calculateAvailableStock(product);
      const stockCoverageDays = calculateStockCoverageDays(availableStock, product.averageDailySales);
      const projectedAfterLeadTime = calculateProjectedStockAfterLeadTime(
        availableStock,
        product.averageDailySales,
        product.leadTimeDays,
        product.incomingStock,
      );
      const targetStock = product.maximumStock;
      const suggestedPurchaseQuantity = calculateSuggestedPurchaseQuantity(targetStock, projectedAfterLeadTime);
      const grossMargin = calculateGrossMargin(product.salePrice, product.cost);
      const grossMarginPercentage = calculateGrossMarginPercentage(product.salePrice, product.cost);
      const daysSinceLastSale = calculateDaysSinceLastSale(product.lastSaleDate, referenceDate);
      const stockStatus = classifyStockStatus(product, availableStock, projectedAfterLeadTime, daysSinceLastSale);
      const abcClass = abcMap.get(product.id) ?? "C";

      const analysisBase = {
        productId: product.id,
        sku: product.sku,
        productName: product.name,
        availableStock,
        stockCoverageDays,
        stockTurnover: null,
        projectedStockAfterLeadTime: projectedAfterLeadTime,
        suggestedPurchaseQuantity,
        grossMargin,
        grossMarginPercentage,
        daysSinceLastSale,
        abcClass,
        stockStatus,
        cost: product.cost,
      };

      const reasons = determineReasons(product, analysisBase);
      const replenishmentScore = calculateReplenishmentScore({
        ...analysisBase,
        reasons,
        replenishmentScore: 0,
        replenishmentPriority: "none",
      });
      const replenishmentPriority = classifyReplenishmentPriority(replenishmentScore);

      return {
        ...analysisBase,
        reasons,
        replenishmentScore,
        replenishmentPriority,
      };
    });
  }

  buildSummary(analyses: InventoryAnalysis[]): InventoryIntelligenceSummary {
    const activeAnalyses = analyses.filter((a) => a.stockStatus !== "inactive");
    const coverageDays = analyses
      .map((a) => a.stockCoverageDays)
      .filter((d): d is number => d !== null);
    const averageCoverageDays =
      coverageDays.length > 0
        ? Math.round(coverageDays.reduce((s, d) => s + d, 0) / coverageDays.length)
        : null;

    const sortedByScore = [...analyses].sort((a, b) => b.replenishmentScore - a.replenishmentScore);

    const idleCapitalAnalyses = analyses.filter(
      (a) => (a.stockStatus === "overstock" || a.stockStatus === "slow_moving") && a.availableStock > 0 && a.cost > 0,
    );

    return {
      totalProducts: analyses.length,
      activeProducts: activeAnalyses.length,
      outOfStockCount: analyses.filter((a) => a.stockStatus === "out_of_stock").length,
      stockoutRiskCount: analyses.filter((a) => a.stockStatus === "stockout_risk").length,
      lowStockCount: analyses.filter((a) => a.stockStatus === "low_stock").length,
      overstockCount: analyses.filter((a) => a.stockStatus === "overstock").length,
      slowMovingCount: analyses.filter((a) => a.stockStatus === "slow_moving").length,
      healthyCount: analyses.filter((a) => a.stockStatus === "healthy").length,
      totalSuggestedPurchaseUnits: analyses.reduce((s, a) => s + a.suggestedPurchaseQuantity, 0),
      estimatedSuggestedPurchaseCost: Math.round(
        analyses.reduce((s, a) => s + a.suggestedPurchaseQuantity * Math.max(0, a.cost), 0),
      ),
      idleCapitalProductCount: analyses.filter(
        (a) => a.stockStatus === "overstock" || a.stockStatus === "slow_moving",
      ).length,
      idleCapitalValue: Math.round(
        idleCapitalAnalyses.reduce((s, a) => s + a.availableStock * a.cost, 0),
      ),
      averageCoverageDays,
      criticalReplenishmentCount: analyses.filter((a) => a.replenishmentPriority === "critical").length,
      topReplenishmentProducts: sortedByScore.slice(0, 10),
    };
  }
}
