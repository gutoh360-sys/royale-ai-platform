import { describe, it, expect } from "vitest";
import { buildFinancialInsights, buildFinancialRecommendations } from "@/features/financial-executive/utils/financial-insights";

const validFinancial = {
  name: "Financeiro",
  formattedRevenue: "R$ 332,5 mil",
  formattedProfit: "R$ 49,9 mil",
  formattedMargin: "15,0%",
  formattedCashFlow: "R$ 39,9 mil",
  formattedWorkingCapital: "R$ 124,5 mil",
  formattedCapitalEmployed: "R$ 183,2 mil",
  growth: 8.3,
  health: 78,
  margin: 15,
};

const criticalFinancial = {
  ...validFinancial,
  growth: -12.5,
  health: 48,
  margin: 8,
};

describe("buildFinancialInsights", () => {
  it("returns 3 insights for valid financial data", () => {
    const result = buildFinancialInsights(validFinancial);
    expect(result).toHaveLength(3);
  });

  it("returns 3 insights for critical financial data", () => {
    const result = buildFinancialInsights(criticalFinancial);
    expect(result).toHaveLength(3);
  });

  it("each insight has fact, reason, impact, action", () => {
    const result = buildFinancialInsights(validFinancial);
    for (const insight of result) {
      expect(insight.fact).toBeTruthy();
      expect(insight.reason).toBeTruthy();
      expect(insight.impact).toBeTruthy();
      expect(insight.action).toBeTruthy();
    }
  });
});

describe("buildFinancialRecommendations", () => {
  it("returns at least 1 recommendation", () => {
    const result = buildFinancialRecommendations(validFinancial);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("returns recommendations for critical financial data", () => {
    const result = buildFinancialRecommendations(criticalFinancial);
    expect(result.length).toBeGreaterThan(0);
  });

  it("each recommendation has action and reason", () => {
    const result = buildFinancialRecommendations(validFinancial);
    for (const rec of result) {
      expect(rec.action).toBeTruthy();
      expect(rec.reason).toBeTruthy();
    }
  });
});
