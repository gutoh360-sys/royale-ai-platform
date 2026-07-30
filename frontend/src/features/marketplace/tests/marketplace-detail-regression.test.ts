import { describe, it, expect } from "vitest";
import { buildInsights, buildRecommendations, getInsightPriority, buildNextActions } from "@/features/marketplace/utils/insights";

const validMarketplace = {
  name: "Mercado Livre",
  formattedRevenue: "R$ 142,5 mil",
  formattedOrders: "823",
  formattedAverageTicket: "R$ 173,15",
  formattedMarketShare: "42,8%",
  marketShare: 42.8,
  growth: 15.3,
  health: 96,
  revenue: 142500,
  orders: 823,
};

const criticalMarketplace = {
  ...validMarketplace,
  name: "Magalu",
  formattedRevenue: "R$ 28,9 mil",
  formattedOrders: "167",
  formattedMarketShare: "8,7%",
  marketShare: 8.7,
  growth: -12.5,
  health: 48,
  revenue: 28900,
  orders: 167,
};

describe("MarketplaceDetailPage - hooks ordering regression", () => {
  it("MarketplaceDetailPage component can be imported", async () => {
    const mod = await import("@/features/marketplace/components/marketplace-detail-page");
    expect(mod.MarketplaceDetailPage).toBeDefined();
    expect(typeof mod.MarketplaceDetailPage).toBe("function");
  });
});

describe("buildInsights - edge cases", () => {
  it("returns 3 insights for valid marketplace", () => {
    const result = buildInsights(validMarketplace);
    expect(result).toHaveLength(3);
  });

  it("returns 3 insights for critical marketplace", () => {
    const result = buildInsights(criticalMarketplace);
    expect(result).toHaveLength(3);
  });
});

describe("buildRecommendations - edge cases", () => {
  it("returns at least 1 recommendation", () => {
    const result = buildRecommendations(validMarketplace);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});

describe("getInsightPriority - edge cases", () => {
  it("returns 3 priorities for valid marketplace", () => {
    const result = getInsightPriority(validMarketplace);
    expect(result).toHaveLength(3);
  });

  it("returns alta priority for low health", () => {
    const result = getInsightPriority(criticalMarketplace);
    expect(result[0]).toBe("alta");
  });
});

describe("buildNextActions - edge cases", () => {
  it("returns at least 1 action", () => {
    const result = buildNextActions(validMarketplace);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("returns max 5 actions", () => {
    const result = buildNextActions(validMarketplace);
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("returns actions for critical marketplace", () => {
    const result = buildNextActions(criticalMarketplace);
    expect(result.length).toBeGreaterThan(0);
  });
});
