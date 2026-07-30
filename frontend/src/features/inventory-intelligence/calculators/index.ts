import { roundToInteger, safeDivide, daysBetween } from "@/features/inventory-intelligence/utils";
import type { StockProduct } from "@/features/inventory-intelligence/types";

export function calculateAvailableStock(product: StockProduct): number {
  return product.currentStock - product.reservedStock;
}

export function calculateStockCoverageDays(availableStock: number, averageDailySales: number): number | null {
  return safeDivide(availableStock, averageDailySales);
}

export function calculateStockTurnover(
  salesLast30Days: number,
  averageStockEstimate: number,
): number | null {
  return safeDivide(salesLast30Days, averageStockEstimate);
}

export function calculateProjectedStockAfterLeadTime(
  availableStock: number,
  averageDailySales: number,
  leadTimeDays: number,
  incomingStock: number,
): number {
  const consumption = averageDailySales * leadTimeDays;
  return availableStock - consumption + incomingStock;
}

export function calculateSuggestedPurchaseQuantity(
  targetStock: number,
  projectedStockAfterLeadTime: number,
): number {
  return Math.max(0, roundToInteger(targetStock - projectedStockAfterLeadTime));
}

export function calculateGrossMargin(salePrice: number, cost: number): number {
  return salePrice - cost;
}

export function calculateGrossMarginPercentage(salePrice: number, cost: number): number | null {
  if (salePrice === 0) return null;
  return ((salePrice - cost) / salePrice) * 100;
}

export function calculateDaysSinceLastSale(lastSaleDate: string, referenceDate?: Date): number {
  return daysBetween(lastSaleDate, referenceDate);
}

export function estimateAverageStock(salesLast30Days: number, lastSaleDate: string, referenceDate?: Date): number {
  const days = daysBetween(lastSaleDate, referenceDate);
  const activeDays = Math.min(days, 30);
  return activeDays > 0 ? salesLast30Days / activeDays : 0;
}
