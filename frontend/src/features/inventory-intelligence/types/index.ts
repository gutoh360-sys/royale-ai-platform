export interface StockProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  currentStock: number;
  reservedStock: number;
  incomingStock: number;
  averageDailySales: number;
  salesLast30Days: number;
  salesLast90Days: number;
  cost: number;
  salePrice: number;
  minimumStock: number;
  maximumStock: number;
  leadTimeDays: number;
  lastSaleDate: string;
  lastPurchaseDate: string;
  active: boolean;
}

export type StockStatus =
  | "out_of_stock"
  | "stockout_risk"
  | "low_stock"
  | "healthy"
  | "overstock"
  | "slow_moving"
  | "inactive";

export type AbcClass = "A" | "B" | "C";

export type ReplenishmentPriority = "critical" | "high" | "medium" | "low" | "none";

export interface InventoryAnalysis {
  productId: string;
  sku: string;
  productName: string;
  availableStock: number;
  stockCoverageDays: number | null;
  stockTurnover: number | null;
  projectedStockAfterLeadTime: number;
  suggestedPurchaseQuantity: number;
  grossMargin: number;
  grossMarginPercentage: number | null;
  daysSinceLastSale: number;
  abcClass: AbcClass;
  stockStatus: StockStatus;
  replenishmentScore: number;
  replenishmentPriority: ReplenishmentPriority;
  reasons: string[];
  cost: number;
}

export interface InventoryIntelligenceSummary {
  totalProducts: number;
  activeProducts: number;
  outOfStockCount: number;
  stockoutRiskCount: number;
  lowStockCount: number;
  overstockCount: number;
  slowMovingCount: number;
  healthyCount: number;
  totalSuggestedPurchaseUnits: number;
  estimatedSuggestedPurchaseCost: number;
  idleCapitalProductCount: number;
  idleCapitalValue: number;
  averageCoverageDays: number | null;
  criticalReplenishmentCount: number;
  topReplenishmentProducts: InventoryAnalysis[];
}
