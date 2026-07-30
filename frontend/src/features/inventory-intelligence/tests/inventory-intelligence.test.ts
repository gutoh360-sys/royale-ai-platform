import { describe, it, expect } from "vitest";
import { calculateAvailableStock, calculateStockCoverageDays, calculateProjectedStockAfterLeadTime, calculateSuggestedPurchaseQuantity, calculateGrossMarginPercentage, calculateDaysSinceLastSale } from "@/features/inventory-intelligence/calculators";
import { classifyStockStatus, classifyAbc, calculateReplenishmentScore, classifyReplenishmentPriority } from "@/features/inventory-intelligence/classifiers";
import { DefaultInventoryIntelligenceService } from "@/features/inventory-intelligence/services/inventory-intelligence-service";
import { mockStockProducts } from "@/features/inventory-intelligence/mocks";
import type { StockProduct, InventoryAnalysis } from "@/features/inventory-intelligence/types";
import { roundToInteger, safeDivide, clamp, daysBetween } from "@/features/inventory-intelligence/utils";

const refDate = new Date("2026-07-27");

function makeProduct(overrides: Partial<StockProduct> = {}): StockProduct {
  return {
    id: "test-id", sku: "TEST-001", name: "Test Product", category: "Test",
    currentStock: 100, reservedStock: 10, incomingStock: 0,
    averageDailySales: 5, salesLast30Days: 150, salesLast90Days: 450,
    cost: 50, salePrice: 100, minimumStock: 20, maximumStock: 200,
    leadTimeDays: 7, lastSaleDate: "2026-07-26", lastPurchaseDate: "2026-07-20",
    active: true,
    ...overrides,
  };
}

describe("utils", () => {
  it("roundToInteger rounds correctly", () => {
    expect(roundToInteger(4.2)).toBe(4);
    expect(roundToInteger(4.8)).toBe(5);
  });

  it("safeDivide returns null for zero denominator", () => {
    expect(safeDivide(10, 0)).toBeNull();
  });

  it("safeDivide returns correct result for valid division", () => {
    expect(safeDivide(10, 3)).toBeCloseTo(3.333, 2);
  });

  it("clamp restricts value to range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it("daysBetween returns correct difference", () => {
    expect(daysBetween("2026-07-27", refDate)).toBe(0);
    expect(daysBetween("2026-07-20", refDate)).toBe(7);
  });
});

describe("calculators", () => {
  it("calculates available stock correctly", () => {
    expect(calculateAvailableStock(makeProduct())).toBe(90);
  });

  it("stock coverage returns null when averageDailySales is 0", () => {
    const p = makeProduct({ averageDailySales: 0 });
    const available = calculateAvailableStock(p);
    expect(calculateStockCoverageDays(available, p.averageDailySales)).toBeNull();
  });

  it("stock coverage returns correct days", () => {
    const p = makeProduct();
    const available = calculateAvailableStock(p);
    expect(calculateStockCoverageDays(available, p.averageDailySales)).toBeCloseTo(18, 0);
  });

  it("projects stock after lead time", () => {
    const p = makeProduct({ averageDailySales: 10, leadTimeDays: 5, incomingStock: 20 });
    const available = calculateAvailableStock(p);
    const projected = calculateProjectedStockAfterLeadTime(available, p.averageDailySales, p.leadTimeDays, p.incomingStock);
    expect(projected).toBe(90 - 50 + 20);
  });

  it("suggested purchase quantity is never negative", () => {
    expect(calculateSuggestedPurchaseQuantity(100, 200)).toBe(0);
  });

  it("suggested purchase quantity rounds to integer", () => {
    expect(calculateSuggestedPurchaseQuantity(100, 45)).toBe(55);
  });

  it("gross margin percentage returns null when salePrice is 0", () => {
    expect(calculateGrossMarginPercentage(0, 50)).toBeNull();
  });

  it("gross margin percentage is correct", () => {
    expect(calculateGrossMarginPercentage(100, 60)).toBeCloseTo(40, 1);
  });

  it("days since last sale is 0 for today", () => {
    expect(calculateDaysSinceLastSale("2026-07-27", refDate)).toBe(0);
  });
});

describe("classifiers", () => {
  it("classifies out_of_stock when available <= 0", () => {
    const p = makeProduct({ currentStock: 0, reservedStock: 0 });
    expect(classifyStockStatus(p, 0, 0, 0)).toBe("out_of_stock");
  });

  it("classifies stockout_risk when projected negative", () => {
    const p = makeProduct({ currentStock: 5, reservedStock: 0, averageDailySales: 2, leadTimeDays: 5, incomingStock: 0 });
    const projected = calculateProjectedStockAfterLeadTime(5, 2, 5, 0);
    expect(classifyStockStatus(p, 5, projected, 0)).toBe("stockout_risk");
  });

  it("classifies inactive", () => {
    const p = makeProduct({ active: false });
    expect(classifyStockStatus(p, 100, 100, 0)).toBe("inactive");
  });

  it("classifies slow_moving", () => {
    const p = makeProduct({ averageDailySales: 0, salesLast30Days: 0, lastSaleDate: "2026-03-01" });
    expect(classifyStockStatus(p, 100, 100, 148)).toBe("slow_moving");
  });

  it("classifies low_stock", () => {
    const p = makeProduct({ currentStock: 10, reservedStock: 0, minimumStock: 15, averageDailySales: 1 });
    expect(classifyStockStatus(p, 10, 10, 0)).toBe("low_stock");
  });

  it("classifies overstock", () => {
    const p = makeProduct({ currentStock: 300, reservedStock: 0, maximumStock: 100, averageDailySales: 1 });
    expect(classifyStockStatus(p, 300, 300, 0)).toBe("overstock");
  });

  it("classifies healthy when nothing else applies", () => {
    const p = makeProduct({ currentStock: 100, reservedStock: 0, minimumStock: 10, maximumStock: 200, averageDailySales: 1 });
    expect(classifyStockStatus(p, 100, 95, 1)).toBe("healthy");
  });

  it("abc classifies correctly", () => {
    const p1 = makeProduct({ id: "a", salesLast90Days: 900, salePrice: 100 });
    const p2 = makeProduct({ id: "b", salesLast90Days: 80, salePrice: 100 });
    const p3 = makeProduct({ id: "c", salesLast90Days: 20, salePrice: 100 });
    const result = classifyAbc([
      { product: p1, salesValue: 90000 },
      { product: p2, salesValue: 8000 },
      { product: p3, salesValue: 2000 },
    ]);
    expect(result.get("a")).toBe("A");
    expect(result.get("b")).toBe("B");
    expect(result.get("c")).toBe("C");
  });

  it("abc all C when total value is 0", () => {
    const p1 = makeProduct({ id: "a", salesLast90Days: 0, salePrice: 100 });
    const p2 = makeProduct({ id: "b", salesLast90Days: 0, salePrice: 100 });
    const result = classifyAbc([
      { product: p1, salesValue: 0 },
      { product: p2, salesValue: 0 },
    ]);
    expect(result.get("a")).toBe("C");
    expect(result.get("b")).toBe("C");
  });

  it("inactive product has priority 0", () => {
    const p = makeProduct({ active: false });
    const analysis: InventoryAnalysis = {
      productId: p.id, sku: p.sku, productName: p.name,
      availableStock: 0, stockCoverageDays: null, stockTurnover: null,
      projectedStockAfterLeadTime: 0, suggestedPurchaseQuantity: 0,
      grossMargin: 0, grossMarginPercentage: null, daysSinceLastSale: 0,
      abcClass: "C", stockStatus: "inactive", reasons: ["Inativo"],
      replenishmentScore: 0, replenishmentPriority: "none",
      cost: 50,
    };
    expect(calculateReplenishmentScore(analysis)).toBe(0);
  });

  it("replenishment priority maps correctly", () => {
    expect(classifyReplenishmentPriority(85)).toBe("critical");
    expect(classifyReplenishmentPriority(70)).toBe("high");
    expect(classifyReplenishmentPriority(50)).toBe("medium");
    expect(classifyReplenishmentPriority(30)).toBe("low");
    expect(classifyReplenishmentPriority(10)).toBe("none");
  });
});

describe("DefaultInventoryIntelligenceService", () => {
  it("analyzes 16 products", () => {
    const service = new DefaultInventoryIntelligenceService();
    const results = service.analyzeProducts(mockStockProducts, refDate);
    expect(results.length).toBe(16);
  });

  it("builds summary with correct totals", () => {
    const service = new DefaultInventoryIntelligenceService();
    const results = service.analyzeProducts(mockStockProducts, refDate);
    const summary = service.buildSummary(results);
    expect(summary.totalProducts).toBe(16);
    expect(summary.topReplenishmentProducts.length).toBeLessThanOrEqual(10);
    const classifiedSum = summary.outOfStockCount + summary.stockoutRiskCount + summary.lowStockCount + summary.overstockCount + summary.slowMovingCount + summary.healthyCount;
    const inactiveCount = summary.totalProducts - summary.activeProducts;
    expect(classifiedSum + inactiveCount).toBe(summary.totalProducts);
  });

  it("out-of-stock product has high priority", () => {
    const service = new DefaultInventoryIntelligenceService();
    const results = service.analyzeProducts(mockStockProducts, refDate);
    const outOfStock = results.find((r) => r.stockStatus === "out_of_stock");
    expect(outOfStock).toBeDefined();
    expect(outOfStock!.replenishmentScore).toBeGreaterThan(0);
  });

  it("inactive product has zero priority", () => {
    const service = new DefaultInventoryIntelligenceService();
    const results = service.analyzeProducts(mockStockProducts, refDate);
    const inactive = results.find((r) => r.stockStatus === "inactive");
    expect(inactive).toBeDefined();
    expect(inactive!.replenishmentScore).toBe(0);
    expect(inactive!.replenishmentPriority).toBe("none");
  });

  it("estimatedSuggestedPurchaseCost uses quantity × cost", () => {
    const service = new DefaultInventoryIntelligenceService();
    const results = service.analyzeProducts(mockStockProducts, refDate);
    const summary = service.buildSummary(results);
    const expected = results
      .filter((a) => a.suggestedPurchaseQuantity > 0)
      .reduce((s, a) => s + a.suggestedPurchaseQuantity * a.cost, 0);
    expect(summary.estimatedSuggestedPurchaseCost).toBe(Math.round(expected));
    expect(summary.estimatedSuggestedPurchaseCost).toBeGreaterThan(0);
  });

  it("estimatedSuggestedPurchaseCost excludes zero-suggested products", () => {
    const p1 = makeProduct({ id: "z1", currentStock: 500, maximumStock: 100, averageDailySales: 5, cost: 100 });
    const p2 = makeProduct({ id: "z2", currentStock: 0, maximumStock: 100, averageDailySales: 5, cost: 200 });
    const service = new DefaultInventoryIntelligenceService();
    const results = service.analyzeProducts([p1, p2], refDate);
    const summary = service.buildSummary(results);
    const suggested = results.filter((a) => a.suggestedPurchaseQuantity > 0);
    expect(summary.estimatedSuggestedPurchaseCost).toBe(
      Math.round(suggested.reduce((s, a) => s + a.suggestedPurchaseQuantity * a.cost, 0)),
    );
  });

  it("estimatedSuggestedPurchaseCost handles zero or negative cost safely", () => {
    const p1 = makeProduct({ id: "z1", currentStock: 0, maximumStock: 100, averageDailySales: 5, cost: 0 });
    const p2 = makeProduct({ id: "z2", currentStock: 0, maximumStock: 100, averageDailySales: 5, cost: -10 });
    const service = new DefaultInventoryIntelligenceService();
    const results = service.analyzeProducts([p1, p2], refDate);
    const summary = service.buildSummary(results);
    expect(summary.estimatedSuggestedPurchaseCost).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(summary.estimatedSuggestedPurchaseCost)).toBe(true);
  });

  it("idleCapitalProductCount counts overstock and slow_moving products", () => {
    const service = new DefaultInventoryIntelligenceService();
    const results = service.analyzeProducts(mockStockProducts, refDate);
    const summary = service.buildSummary(results);
    const expected = results.filter(
      (a) => a.stockStatus === "overstock" || a.stockStatus === "slow_moving",
    ).length;
    expect(summary.idleCapitalProductCount).toBe(expected);
  });

  it("idleCapitalValue sums availableStock × cost for idle products", () => {
    const p1 = makeProduct({ id: "o1", currentStock: 100, reservedStock: 0, maximumStock: 50, averageDailySales: 1, cost: 50 });
    const p2 = makeProduct({ id: "s1", currentStock: 30, reservedStock: 0, maximumStock: 200, averageDailySales: 0, cost: 20, lastSaleDate: "2026-03-01" });
    const service = new DefaultInventoryIntelligenceService();
    const results = service.analyzeProducts([p1, p2], refDate);
    const summary = service.buildSummary(results);
    expect(summary.idleCapitalProductCount).toBe(2);
    const expected = (100 * 50) + (30 * 20);
    expect(summary.idleCapitalValue).toBe(Math.round(expected));
  });

  it("idleCapitalValue excludes healthy products", () => {
    const p1 = makeProduct({ id: "h1", currentStock: 100, reservedStock: 0, maximumStock: 200, minimumStock: 10, averageDailySales: 1, cost: 50 });
    const service = new DefaultInventoryIntelligenceService();
    const results = service.analyzeProducts([p1], refDate);
    const summary = service.buildSummary(results);
    expect(summary.idleCapitalProductCount).toBe(0);
    expect(summary.idleCapitalValue).toBe(0);
  });

  it("consolidated summary has real monetary values with mock products", () => {
    const service = new DefaultInventoryIntelligenceService();
    const results = service.analyzeProducts(mockStockProducts, refDate);
    const summary = service.buildSummary(results);
    expect(summary.estimatedSuggestedPurchaseCost).toBeGreaterThan(0);
    expect(summary.idleCapitalProductCount).toBeGreaterThan(0);
    expect(summary.idleCapitalValue).toBeGreaterThan(0);
    expect(summary.idleCapitalProductCount + summary.healthyCount + summary.outOfStockCount + summary.stockoutRiskCount + summary.lowStockCount).toBe(summary.activeProducts);
  });

  it("idleCapitalValue > 0 for mock products that have overstock or slow_moving", () => {
    const service = new DefaultInventoryIntelligenceService();
    const results = service.analyzeProducts(mockStockProducts, refDate);
    const summary = service.buildSummary(results);
    const idle = results.filter(
      (a) => a.stockStatus === "overstock" || a.stockStatus === "slow_moving",
    );
    const expectedValue = idle
      .filter((a) => a.availableStock > 0 && a.cost > 0)
      .reduce((s, a) => s + a.availableStock * a.cost, 0);
    expect(summary.idleCapitalValue).toBe(Math.round(expectedValue));
  });
});
