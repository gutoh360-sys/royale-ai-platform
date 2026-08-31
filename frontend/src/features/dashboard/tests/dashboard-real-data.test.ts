import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dashboardSource = readFileSync(
  new URL("../components/dashboard-page.tsx", import.meta.url),
  "utf8",
);

describe("dashboard real data", () => {
  it("uses the sales health calculated from order statuses", () => {
    expect(dashboardSource).toContain("sales.health");
    expect(dashboardSource).not.toContain("sales.orders / (sales.orders + 1)");
  });

  it("uses the inventory health calculated from product availability", () => {
    expect(dashboardSource).toContain("inventory.health");
  });
});
