import { afterEach, describe, expect, it, vi } from "vitest"
import { fetchProductsData } from "@/services/api-products"
import type { Product } from "@/types/api"

const products: Product[] = [
  {
    id: "product-1",
    sku: "SKU-001",
    bling_id: "bling-1",
    ean: "7890000000011",
    name: "Produto Alpha",
    description: null,
    brand: "Marca A",
    category_id: "11111111-1111-1111-1111-111111111111",
    price: "100.00",
    cost: "60.00",
    stock_quantity: 0,
    active: true,
    attributes: null,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    last_synced_at: "2026-08-05T00:00:00Z",
  },
  {
    id: "product-2",
    sku: "SKU-002",
    bling_id: "bling-2",
    ean: "7890000000028",
    name: "Produto Beta",
    description: null,
    brand: "Marca B",
    category_id: "22222222-2222-2222-2222-222222222222",
    price: "50.00",
    cost: null,
    stock_quantity: 7,
    active: false,
    attributes: null,
    created_at: "2026-08-02T00:00:00Z",
    updated_at: "2026-08-02T00:00:00Z",
    last_synced_at: null,
  },
  {
    id: "product-3",
    sku: "REAL-SEARCH",
    bling_id: "bling-3",
    ean: null,
    name: "Produto Gamma",
    description: null,
    brand: "Marca A",
    category_id: "33333333-3333-3333-3333-333333333333",
    price: "0.00",
    cost: null,
    stock_quantity: 55,
    active: true,
    attributes: null,
    created_at: "2026-08-03T00:00:00Z",
    updated_at: "2026-08-03T00:00:00Z",
    last_synced_at: "2026-08-06T00:00:00Z",
  },
]

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } })
}

describe("products real catalog data", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("uses real GET /products and never requests product sales analytics", async () => {
    const fetchMock = vi.fn((url: string) => Promise.resolve(jsonResponse(products)))
    vi.stubGlobal("fetch", fetchMock)

    const result = await fetchProductsData()

    expect(fetchMock).toHaveBeenCalledWith("/api/backend/products", expect.any(Object))
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("/analytics/products"), expect.anything())
    expect(result.products.map((product) => product.sku)).toEqual(["SKU-001", "SKU-002", "REAL-SEARCH"])
  })

  it("builds catalog KPIs only from Product fields", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse(products))))

    const result = await fetchProductsData()

    expect(result.summary.totalProducts).toBe(3)
    expect(result.summary.activeProducts).toBe(2)
    expect(result.summary.outOfStockProducts).toBe(1)
    expect(result.summary.totalStock).toBe(62)
    expect(result.summary.productsWithPrice).toBe(2)
    expect(result.summary.averageRegisteredPrice).toBe("R$ 75,00")
    expect(result.summary.brands).toBe(2)
    expect(result.summary.categories).toBe(0)
  })

  it("does not expose category UUIDs when no category name is resolved", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse(products))))

    const result = await fetchProductsData()

    expect(result.products.every((product) => product.category === "Sem categoria")).toBe(true)
    expect(JSON.stringify(result.products)).not.toContain("11111111-1111-1111-1111-111111111111")
  })

  it("shows sales KPIs as unavailable instead of zero fake values", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse(products))))

    const result = await fetchProductsData()

    expect(result.salesAnalytics).toBeNull()
    expect(result.summary.totalRevenue).toBe("N/D")
    expect(result.summary.averageMargin).toBe("N/D")
    expect(result.summary.growth).toBe("N/D")
    expect(result.summary.topSku).toBe("N/D")
    expect(result.summary.topSkuName).toBe("N/D")
    expect(result.summary.top10Concentration).toBe("N/D")
  })

  it("builds real stock, brand, category and status charts", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse(products))))

    const result = await fetchProductsData()

    expect(result.stockDistribution).toEqual([
      { name: "Sem estoque", count: 1 },
      { name: "1-5 unidades", count: 0 },
      { name: "6-20", count: 1 },
      { name: "21-50", count: 0 },
      { name: "50+", count: 1 },
    ])
    expect(result.brandDistribution).toEqual([
      { name: "Marca A", count: 2 },
      { name: "Marca B", count: 1 },
    ])
    expect(result.categoryDistribution).toEqual([{ name: "Sem categoria", count: 3 }])
    expect(result.statusDistribution).toEqual([
      { name: "Ativos", count: 2 },
      { name: "Inativos", count: 1 },
    ])
  })

  it("keeps table rows real and searchable by SKU/EAN/name", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse(products))))

    const result = await fetchProductsData()
    const text = result.products.map((product) => `${product.sku} ${product.name} ${product.ean ?? ""}`).join(" ")

    expect(text).toContain("REAL-SEARCH")
    expect(text).toContain("7890000000011")
    expect(text).toContain("Produto Beta")
  })
})
