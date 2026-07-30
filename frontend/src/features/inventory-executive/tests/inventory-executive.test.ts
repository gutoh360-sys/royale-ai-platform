import { describe, it, expect } from "vitest";
import { buildInventoryInsights, buildInventoryRecommendations } from "@/features/inventory-executive/utils/inventory-insights";

const validInput = {
  formattedImmobilizedCapital: "R$ 187,0 mil",
  formattedAverageCoverage: "38 dias",
  formattedAverageTurnover: "4,2x",
  summary: {
    totalProducts: 16,
    activeProducts: 15,
    outOfStockCount: 2,
    stockoutRiskCount: 5,
    lowStockCount: 0,
    overstockCount: 4,
    slowMovingCount: 1,
    healthyCount: 3,
    totalSuggestedPurchaseUnits: 482,
    estimatedSuggestedPurchaseCost: 76800,
    idleCapitalProductCount: 5,
    idleCapitalValue: 165805,
    averageCoverageDays: 77,
    criticalReplenishmentCount: 5,
    topReplenishmentProducts: [],
  },
};

const criticalInput = {
  ...validInput,
  summary: {
    ...validInput.summary,
    idleCapitalProductCount: 8,
    idleCapitalValue: 250000,
    criticalReplenishmentCount: 8,
    averageCoverageDays: 18,
    slowMovingCount: 4,
    overstockCount: 6,
  },
};

const healthyInput = {
  ...validInput,
  summary: {
    ...validInput.summary,
    idleCapitalProductCount: 0,
    idleCapitalValue: 0,
    criticalReplenishmentCount: 0,
    slowMovingCount: 0,
    overstockCount: 0,
    averageCoverageDays: 77,
    healthyCount: 15,
  },
};

describe("buildInventoryInsights", () => {
  it("returns 3 insights for valid inventory data", () => {
    const result = buildInventoryInsights(validInput);
    expect(result).toHaveLength(3);
  });

  it("returns 3 insights for critical inventory data", () => {
    const result = buildInventoryInsights(criticalInput);
    expect(result).toHaveLength(3);
  });

  it("each insight has fact, reason, impact, action", () => {
    const result = buildInventoryInsights(validInput);
    for (const insight of result) {
      expect(insight.fact).toBeTruthy();
      expect(insight.reason).toBeTruthy();
      expect(insight.impact).toBeTruthy();
      expect(insight.action).toBeTruthy();
    }
  });

  it("reflects idle capital in insights", () => {
    const result = buildInventoryInsights(criticalInput);
    expect(result[0].fact).toContain("Capital imobilizado");
    expect(result[0].action).toContain("Revisar");
  });

  it("reflects coverage in insights", () => {
    const result = buildInventoryInsights(criticalInput);
    expect(result[1].fact).toContain("Cobertura");
  });

  it("works with healthy (no idle capital) data", () => {
    const result = buildInventoryInsights(healthyInput);
    expect(result).toHaveLength(3);
    expect(result[0].reason).toBeTruthy();
  });
});

describe("buildInventoryRecommendations", () => {
  it("returns at least 1 recommendation", () => {
    const result = buildInventoryRecommendations(validInput);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("returns recommendations for critical inventory data", () => {
    const result = buildInventoryRecommendations(criticalInput);
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns specific recommendation for idle capital", () => {
    const result = buildInventoryRecommendations(criticalInput);
    const hasCapitalRec = result.some((r) => r.action.toLowerCase().includes("capital"));
    expect(hasCapitalRec).toBe(true);
  });

  it("returns specific recommendation for slow moving products", () => {
    const result = buildInventoryRecommendations(criticalInput);
    const hasSlowRec = result.some((r) => r.action.toLowerCase().includes("sem giro") || r.action.toLowerCase().includes("excesso"));
    expect(hasSlowRec).toBe(true);
  });

  it("returns specific recommendation for critical replenishment", () => {
    const result = buildInventoryRecommendations(criticalInput);
    const hasCriticalRec = result.some((r) => r.action.toLowerCase().includes("repor") || r.action.toLowerCase().includes("critica"));
    expect(hasCriticalRec).toBe(true);
  });

  it("each recommendation has action and reason", () => {
    const result = buildInventoryRecommendations(validInput);
    for (const rec of result) {
      expect(rec.action).toBeTruthy();
      expect(rec.reason).toBeTruthy();
    }
  });

  it("returns fewer recommendations for healthy data", () => {
    const result = buildInventoryRecommendations(healthyInput);
    expect(result.length).toBe(1);
    expect(result[0].action).toContain("Manter");
  });
});
