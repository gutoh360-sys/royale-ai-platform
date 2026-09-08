import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { ProductSalesView } from "../components/product-sales-section";
import { fetchProductSales, invalidateProductSales, type ProductSales, type SalesPeriod } from "@/services/product-sales";
import { runProductBatches, runOrderItemBatches } from "@/services/sync-batches";
import { GET } from "@/app/api/backend/[...path]/route";

const data: ProductSales = { period: "30d", products: [], top10: [], sold_out: [], total_revenue: 210,
  quantity: 6, total_orders: 2, average_margin: 80, growth: null, cost_coverage: 0.7,
  eligible_orders: 3, orders_with_items: 2, coverage: 2 / 3, top_sku: "A" };

beforeEach(() => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) };
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("sessionStorage", storage);
  vi.stubGlobal("window", { dispatchEvent: vi.fn() });
  invalidateProductSales();
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it.each<SalesPeriod>(["today", "7d", "30d", "90d", "12m"])("proxy forwards %s to the backend instead of dropping period", async (period) => {
  vi.stubEnv("BLING_ADMIN_USERNAME", "test");
  vi.stubEnv("BLING_ADMIN_PASSWORD", "test");
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => data });
  vi.stubGlobal("fetch", fetcher);
  const response = await GET(new Request(`http://test/api/backend/analytics/products?period=${period}`), {
    params: Promise.resolve({ path: ["analytics", "products"] }),
  });
  expect(response.status).toBe(200);
  expect(new URL(fetcher.mock.calls[0][0]).searchParams.get("period")).toBe(period);
});

it.each<SalesPeriod>(["today", "7d", "30d", "90d", "12m"])("requests and caches the actual %s period", async (period) => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...data, period }) });
  vi.stubGlobal("fetch", fetcher);
  await fetchProductSales(period);
  await fetchProductSales(period);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0][0]).toBe(`/api/backend/analytics/products?period=${period}`);
  invalidateProductSales();
  await fetchProductSales(period);
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it("renders periods, loading, error retry and partial sales without fake zeros", () => {
  const render = (state: string) => renderToStaticMarkup(createElement(ProductSalesView, { period: "30d", onPeriod: () => {}, data, state, retry: () => {} }));
  expect(render("loading")).toContain("Carregando vendas");
  expect(render("error")).toContain("Tentar novamente");
  expect(render("error")).not.toContain("Top 10");
  const html = render("success");
  for (const label of ["Hoje", "7 dias", "30 dias", "90 dias", "12 meses", "Cobertura parcial", "2 / 3", "Sem base de calculo", "Top 10 por receita"]) expect(html).toContain(label);
  expect(html).not.toContain("N/D");
});

it("loops 23 product pages in five separate HTTP requests with the same owner", async () => {
  const fetcher = vi.fn().mockImplementation(async () => {
    const start = (fetcher.mock.calls.length - 1) * 5 + 1;
    const end = Math.min(start + 4, 23);
    return { ok: true, json: async () => ({ start_page: start, end_page: end, next_page: end + 1, has_more: end < 23, failed: 0 }) };
  });
  vi.stubGlobal("fetch", fetcher);
  await runProductBatches(() => {});
  expect(fetcher).toHaveBeenCalledTimes(5);
  expect(new Set(fetcher.mock.calls.map((call) => JSON.parse(call[1].body).operation_id)).size).toBe(1);
});

it("retains product ownership on failure and uses cursor for order batches", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 502 }));
  await expect(runProductBatches(() => {})).rejects.toThrow("502");
  expect(sessionStorage.getItem("bling-product-operation")).toBeTruthy();
  const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ next_cursor: "100", has_more: true, failed: 0 }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ next_cursor: "150", has_more: false, failed: 0 }) });
  vi.stubGlobal("fetch", fetcher);
  await runOrderItemBatches(() => {});
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toMatchObject({ limit: 100, after_external_id: "100" });
});
