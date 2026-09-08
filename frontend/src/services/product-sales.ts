import { api } from "@/lib/api";

export type SalesPeriod = "today" | "7d" | "30d" | "90d" | "12m";
export interface ProductSale {
  id: string; sku: string; name: string; stock_quantity: number;
  total_revenue: number; quantity: number; order_count: number;
  margin: number | null; growth: number | null; cost_coverage: number | null;
}
export interface ProductSales {
  period: SalesPeriod; products: ProductSale[]; top10: ProductSale[]; sold_out: ProductSale[];
  total_revenue: number; quantity: number; total_orders: number;
  average_margin: number | null; growth: number | null; cost_coverage: number | null;
  eligible_orders: number; orders_with_items: number; coverage: number | null; top_sku: string | null;
}
const cache = new Map<SalesPeriod, { at: number; revision: string | null; data: ProductSales }>();
const revisionKey = "product-sales-revision";
export function invalidateProductSales() {
  cache.clear();
  localStorage.setItem(revisionKey, String(Date.now()));
  window.dispatchEvent(new Event("products-synced"));
}
export async function fetchProductSales(period: SalesPeriod, force = false): Promise<ProductSales> {
  const revision = localStorage.getItem(revisionKey);
  const cached = cache.get(period);
  if (!force && cached && cached.revision === revision && Date.now() - cached.at < 60_000) return cached.data;
  const data = await api.get<ProductSales>(`/analytics/products?period=${period}`, { cache: "no-store" });
  cache.set(period, { at: Date.now(), revision, data });
  return data;
}
