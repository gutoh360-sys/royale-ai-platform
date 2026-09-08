import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dashboardPageSource = readFileSync(
  new URL("../components/dashboard-page.tsx", import.meta.url),
  "utf8",
);

const apiMarketplaceSource = readFileSync(
  new URL("../../../services/api-marketplace.ts", import.meta.url),
  "utf8",
);

describe("Dashboard period interaction", () => {
  it("defaults to 30d with correct initial state", () => {
    expect(dashboardPageSource).toContain('useState<Period>("30d")');
  });

  it("passes period to all data hooks", () => {
    expect(dashboardPageSource).toContain("useExecutiveCommandCenter(period)");
    expect(dashboardPageSource).toContain("useMarketplaceData(period)");
  });

  it("shows empty state when marketplace data has no sales", () => {
    expect(dashboardPageSource).toContain("Nenhuma venda encontrada neste período");
    expect(dashboardPageSource).toContain("Selecione um período maior para visualizar o desempenho dos canais");
  });

  it("empty state appears only when status is success and no marketplaces", () => {
    expect(dashboardPageSource).toContain('mpStatus === "success" && topMarketplaces.length === 0');
  });

  it("marketplace cards appear when status is success and has marketplaces", () => {
    expect(dashboardPageSource).toContain('mpStatus === "success" && topMarketplaces.length > 0');
  });

  it("Sem Estoque KPI is not temporal", () => {
    expect(dashboardPageSource).toContain("outOfStock");
    expect(dashboardPageSource).not.toContain("outOfStock(period");
  });

  it("marketplace service uses backend aggregation endpoint", () => {
    expect(apiMarketplaceSource).toContain("/analytics/marketplace-revenue");
    expect(apiMarketplaceSource).toContain("fetchMarketplaceData(period: Period");
  });

  it("individual marketplace cards show explicit values not dashes", () => {
    expect(apiMarketplaceSource).toContain('formattedAverageTicket: total > 0 ? formatCurrency(currentRevenue / total) : formatCurrency(0)');
    expect(apiMarketplaceSource).toContain('formattedMarketShare: "0%"');
  });
});
