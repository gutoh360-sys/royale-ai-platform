import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCommandCenterData } from "./api-command-center";
import { fetchInventoryData } from "./api-inventory";
import { fetchMarketplaceData } from "./api-marketplace";
import { fetchSalesData } from "./api-orders";
import { fetchProductsData } from "./api-products";
import type { DashboardAnalytics, Order, Product } from "@/types/api";

const orders: Order[] = [
  {
    id: "order-1",
    external_id: "ext-1",
    marketplace: "MERCADO_LIVRE",
    order_number: "1",
    customer_name: "Cliente A",
    customer_document: null,
    customer_email: null,
    customer_phone: null,
    status: "completed",
    total_amount: 100,
    shipping_amount: null,
    discount_amount: null,
    payment_method: null,
    notes: null,
    ordered_at: "2026-08-01T00:00:00Z",
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    last_synced_at: "2026-08-01T00:00:00Z",
    items: [],
  },
  {
    id: "order-2",
    external_id: "ext-2",
    marketplace: "SHOPEE",
    order_number: "2",
    customer_name: "Cliente B",
    customer_document: null,
    customer_email: null,
    customer_phone: null,
    status: "pending",
    total_amount: 50,
    shipping_amount: null,
    discount_amount: null,
    payment_method: null,
    notes: null,
    ordered_at: "2026-08-02T00:00:00Z",
    created_at: "2026-08-02T00:00:00Z",
    updated_at: "2026-08-02T00:00:00Z",
    last_synced_at: "2026-08-02T00:00:00Z",
    items: [],
  },
];

const products: Product[] = [
  {
    id: "product-1",
    sku: "SKU-1",
    bling_id: "bling-1",
    ean: null,
    name: "Produto A",
    description: null,
    brand: null,
    category_id: "cat-1",
    price: 100,
    cost: 60,
    stock_quantity: 10,
    active: true,
    attributes: null,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    last_synced_at: "2026-08-01T00:00:00Z",
  },
  {
    id: "product-2",
    sku: "SKU-2",
    bling_id: "bling-2",
    ean: null,
    name: "Produto B",
    description: null,
    brand: null,
    category_id: "cat-2",
    price: 50,
    cost: null,
    stock_quantity: 0,
    active: true,
    attributes: null,
    created_at: "2026-08-02T00:00:00Z",
    updated_at: "2026-08-02T00:00:00Z",
    last_synced_at: "2026-08-02T00:00:00Z",
  },
];

const analytics: DashboardAnalytics = {
  total_products: 2,
  active_products: 2,
  products_without_stock: 1,
  total_stock: 10,
  total_orders: 2,
  orders_by_status: { completed: 1, pending: 1 },
  revenue: 150,
  average_ticket: 75,
  sales_by_period: [
    { day: "2026-08-01", total_orders: 1, revenue: 100 },
    { day: "2026-08-02", total_orders: 1, revenue: 50 },
  ],
};

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
  });
}

function stubBackendReads() {
  const fetchMock = vi.fn((url: string) => {
    if (url.startsWith("/api/backend/orders")) return Promise.resolve(jsonResponse(orders));
    if (url.startsWith("/api/backend/products")) return Promise.resolve(jsonResponse(products));
    if (url.startsWith("/api/backend/analytics/dashboard")) return Promise.resolve(jsonResponse(analytics));
    return Promise.resolve(new Response("Not found", { status: 404 }));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("real backend data services", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("maps real order channels into Marketplace rows", async () => {
    const fetchMock = stubBackendReads();

    const result = await fetchMarketplaceData();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/backend/orders",
      expect.objectContaining({ method: "GET" }),
    );
    expect(result.status).toBe("success");
    expect(result.marketplaces.map((m) => m.name)).toEqual(["Mercado Livre", "Shopee"]);
  });

  it("keeps Products on real product reads", async () => {
    stubBackendReads();

    const result = await fetchProductsData();

    expect(result.status).toBe("success");
    expect(result.products).toHaveLength(2);
    expect(result.summary.activeProducts).toBe(2);
  });

  it("keeps Inventory on real products plus analytics", async () => {
    stubBackendReads();

    const result = await fetchInventoryData(7);

    expect(result.status).toBe("success");
    expect(result.inventory?.itemsInStock).toBe(1);
    expect(result.inventory?.criticalItems).toBe(1);
  });

  it("keeps Sales on real orders plus analytics", async () => {
    stubBackendReads();

    const result = await fetchSalesData(7);

    expect(result.status).toBe("success");
    expect(result.sales?.orders).toBe(2);
    expect(result.sales?.health).toBe(50);
  });

  it("keeps Dashboard command center on real analytics", async () => {
    stubBackendReads();

    const result = await fetchCommandCenterData(7);

    expect(result.status).toBe("success");
    expect(result.data.status.summary).toContain("2 pedidos");
    expect(result.data.recommendations.map((r) => r.id)).toContain("restock");
  });
});
