import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import type { Product, DashboardAnalytics } from "@/types/api";
import type { InventoryData, InventoryDataResult } from "@/features/inventory-executive/types";
import type { InventoryIntelligenceSummary } from "@/features/inventory-intelligence/types";

function buildSummary(products: Product[], analytics: DashboardAnalytics): InventoryIntelligenceSummary {
  const withStock = products.filter((p) => p.stock_quantity > 0);
  const outOfStock = products.filter((p) => p.stock_quantity <= 0 && p.active);
  const totalValue = products.reduce((s, p) => s + p.price * p.stock_quantity, 0);

  return {
    totalProducts: products.length,
    activeProducts: analytics.active_products,
    outOfStockCount: outOfStock.length,
    stockoutRiskCount: 0,
    lowStockCount: withStock.filter((p) => p.stock_quantity < 5).length,
    overstockCount: 0,
    slowMovingCount: 0,
    healthyCount: withStock.length,
    totalSuggestedPurchaseUnits: 0,
    estimatedSuggestedPurchaseCost: 0,
    idleCapitalProductCount: outOfStock.length,
    idleCapitalValue: totalValue,
    averageCoverageDays: null,
    criticalReplenishmentCount: 0,
    topReplenishmentProducts: [],
  };
}

export async function fetchInventoryData(): Promise<InventoryDataResult> {
  try {
    const [products, analytics] = await Promise.all([
      api.get<Product[]>("/products"),
      api.get<DashboardAnalytics>("/api/analytics?days=30"),
    ]);

    if (products.length === 0) {
      return { inventory: null, status: "empty", error: null };
    }

    const summary = buildSummary(products, analytics);
    const withStock = products.filter((p) => p.stock_quantity > 0);
    const totalValue = products.reduce((s, p) => s + p.price * p.stock_quantity, 0);

    const inventory: InventoryData = {
      id: "main",
      name: "Estoque Geral",
      health: analytics.total_stock > 0 ? 75 : 0,
      itemsInStock: withStock.length,
      formattedItemsInStock: String(withStock.length),
      itemsWithoutTurnover: summary.slowMovingCount,
      formattedItemsWithoutTurnover: String(summary.slowMovingCount),
      criticalItems: summary.outOfStockCount,
      formattedCriticalItems: String(summary.outOfStockCount),
      averageCoverage: 0,
      formattedAverageCoverage: "-",
      averageTurnover: 0,
      formattedAverageTurnover: "-",
      immobilizedCapital: totalValue,
      formattedImmobilizedCapital: formatCurrency(totalValue),
      stockValue: totalValue,
      formattedStockValue: formatCurrency(totalValue),
      totalCapacity: products.length,
      formattedTotalCapacity: String(products.length),
      utilizationRate: products.length > 0 ? (withStock.length / products.length) * 100 : 0,
      formattedUtilizationRate: `${products.length > 0 ? Math.round((withStock.length / products.length) * 100) : 0}%`,
      lastUpdate: new Date().toISOString(),
      summary,
    };

    return { inventory, status: "success", error: null };
  } catch (e) {
    return { inventory: null, status: "error", error: e instanceof Error ? e.message : "Unknown error" };
  }
}
