import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dashboardSource = readFileSync(
  new URL("../components/dashboard-page.tsx", import.meta.url),
  "utf8",
);

describe("dashboard real data", () => {
  it("uses marketplace summary for KPIs", () => {
    expect(dashboardSource).toContain("mpSummary.totalRevenue");
    expect(dashboardSource).toContain("mpSummary.formattedTotalOrders");
    expect(dashboardSource).toContain("mpSummary.averageTicket");
  });

  it("uses products summary for out-of-stock count", () => {
    expect(dashboardSource).toContain("prSummary.outOfStockProducts");
  });
});
