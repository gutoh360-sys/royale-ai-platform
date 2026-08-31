import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../../..");

function readSource(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("priority screens API regression", () => {
  it("Marketplace uses real orders through the shared API adapter and has a controlled error state", () => {
    const service = readSource("services/api-marketplace.ts");
    const page = readSource("features/marketplace/components/marketplace-overview.tsx");

    expect(service).toContain('api.get<SalesChannel[]>("/sales-channels")');
    expect(service).toContain('api.get<Order[]>("/orders")');
    expect(service).toContain("groupOrdersByMarketplace");
    expect(service).toContain("mapChannelsToMarketplaces");
    expect(service).not.toMatch(/mock/i);
    expect(page).toContain('status === "error"');
    expect(page).toContain("Erro ao carregar marketplaces");
    expect(page).toContain("marketplaces.map");
  });

  it("Products continues to use real product data and controlled errors", () => {
    const service = readSource("services/api-products.ts");
    const page = readSource("features/products-executive/components/products-detail-page.tsx");

    expect(service).toContain('api.get<Product[]>("/products")');
    expect(page).toContain("useProductsData");
    expect(page).toContain('status === "error"');
    expect(page).toContain("Erro ao carregar dados de produtos");
  });

  it("Inventory continues to use products and analytics with reachable errors", () => {
    const service = readSource("services/api-inventory.ts");
    const page = readSource("features/inventory-executive/components/inventory-detail-page.tsx");

    expect(service).toContain('api.get<Product[]>("/products")');
    expect(service).toContain('api.get<DashboardAnalytics>(`/analytics/dashboard?days=${days}`)');
    expect(page.indexOf('if (status === "error")')).toBeLessThan(page.indexOf("if (!inventory) {"));
    expect(page).toContain("Erro ao carregar dados de estoque");
  });

  it("Sales uses real sales data instead of mock service data", () => {
    const page = readSource("features/sales-executive/sales-detail-page.tsx");
    const service = readSource("features/sales-executive/service.ts");

    expect(service).not.toContain("buildMockSalesExecutive");
    expect(service).toContain("fetchSalesExecutiveData");
    expect(page).toContain("Erro ao carregar dados de vendas");
  });

  it("Dashboard keeps all priority hooks wired to real data", () => {
    const page = readSource("features/dashboard/components/dashboard-page.tsx");

    expect(page).toContain("useExecutiveCommandCenter");
    expect(page).toContain("useMarketplaceData");
    expect(page).toContain("useInventoryData");
    expect(page).toContain("useSalesData");
    expect(page).toContain("useProductsData");
    expect(page).toContain('ccStatus === "error"');
    expect(page).toContain('<ExecutiveSummary state="error" />');
  });
});
