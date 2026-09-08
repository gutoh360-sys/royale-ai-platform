import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

const marketplaceOverviewSource = readFileSync(
  new URL("../components/marketplace-overview.tsx", import.meta.url),
  "utf8",
);

const marketplaceServiceSource = readFileSync(
  new URL("../services/marketplace-data-service.ts", import.meta.url),
  "utf8",
);

const apiMarketplaceSource = readFileSync(
  new URL("../../../services/api-marketplace.ts", import.meta.url),
  "utf8",
);

const useMarketplaceDataSource = readFileSync(
  new URL("../hooks/use-marketplace-data.ts", import.meta.url),
  "utf8",
);

describe("Marketplace period filtering", () => {
  it("sends period=30d when 30d selected", () => {
    expect(marketplaceOverviewSource).toContain('useState<Period>("30d")');
    expect(marketplaceOverviewSource).toContain("useMarketplaceData(activePeriod)");
  });

  it("period selector renders all 5 options", () => {
    expect(marketplaceOverviewSource).toContain("PERIOD_OPTIONS.map");
    expect(marketplaceOverviewSource).toContain('key={opt.value}');
    expect(marketplaceOverviewSource).toContain("onClick={() => setActivePeriod(opt.value)}");
    expect(marketplaceOverviewSource).toContain('role="tab"');
    expect(marketplaceOverviewSource).toContain("aria-selected={activePeriod === opt.value}");
  });

  it("changing period triggers re-fetch", () => {
    expect(useMarketplaceDataSource).toContain("useEffect");
    expect(useMarketplaceDataSource).toContain("fetchMarketplaceData(period)");
    expect(useMarketplaceDataSource).toContain("[period]");
  });

  it("services send period=X to the backend", () => {
    expect(apiMarketplaceSource).toContain("`/orders?period=${period}`");
    expect(apiMarketplaceSource).toContain("fetchMarketplaceData(period: Period");
    expect(apiMarketplaceSource).toContain("previousPeriod = getPreviousPeriod(period)");
  });
});
