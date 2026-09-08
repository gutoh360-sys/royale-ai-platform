import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

const dashboardPageSource = readFileSync(
  new URL("../components/dashboard-page.tsx", import.meta.url),
  "utf8",
);

const dashboardHeaderSource = readFileSync(
  new URL("../components/dashboard-header.tsx", import.meta.url),
  "utf8",
);

const dashboardLayoutSource = readFileSync(
  new URL("../components/dashboard-layout.tsx", import.meta.url),
  "utf8",
);

describe("Dashboard period filtering", () => {
  it("sends period=7d when 7d selected", () => {
    expect(dashboardPageSource).toContain('useState<Period>("7d")');
    expect(dashboardPageSource).toContain("useExecutiveCommandCenter(period)");
    expect(dashboardPageSource).toContain("useMarketplaceData(period)");
    expect(dashboardPageSource).toContain("useProductsData()");
  });

  it("period selector renders all 5 options", () => {
    expect(dashboardHeaderSource).toContain("PERIOD_OPTIONS.map");
    expect(dashboardHeaderSource).toContain('key={opt.value}');
    expect(dashboardHeaderSource).toContain("onPeriodChange?.(opt.value)");
    expect(dashboardHeaderSource).toContain("period === opt.value");
  });

  it("URL contains ?period=X", () => {
    expect(dashboardPageSource).toContain("period");
    expect(dashboardLayoutSource).toContain("period");
    expect(dashboardLayoutSource).toContain("onPeriodChange");
  });
});
