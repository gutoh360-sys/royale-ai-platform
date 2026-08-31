import { api } from "@/lib/api";
import { formatCurrency, formatPercentage } from "@/lib/format";
import type { Product } from "@/types/api";
import type {
  ProductPerformance,
  CategoryData,
  PortfolioSummary,
  ProductsDataResult,
} from "@/features/products-executive/types";

function mapProduct(p: Product, totalRevenue: number): ProductPerformance {
  const revenue = p.price * (p.stock_quantity > 0 ? 1 : 0);
  const margin = p.cost && p.cost > 0 ? ((p.price - p.cost) / p.price) * 100 : 0;
  const share = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;

  let status: ProductPerformance["status"] = "question_mark";
  if (margin > 40 && share > 5) status = "star";
  else if (margin > 20 && share > 3) status = "cash_cow";
  else if (margin < 10 || share < 1) status = "dog";

  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    category: p.category_id,
    revenue,
    formattedRevenue: formatCurrency(revenue),
    orders: 0,
    formattedOrders: "0",
    margin,
    formattedMargin: formatPercentage(margin),
    growth: 0,
    share,
    formattedShare: formatPercentage(share),
    status,
  };
}

function mapCategories(products: ProductPerformance[]): CategoryData[] {
  const byCategory = new Map<string, ProductPerformance[]>();
  for (const p of products) {
    const key = p.category || "Sem categoria";
    const arr = byCategory.get(key) ?? [];
    arr.push(p);
    byCategory.set(key, arr);
  }

  return Array.from(byCategory.entries()).map(([name, items]) => {
    const revenue = items.reduce((s, p) => s + p.revenue, 0);
    return {
      name,
      revenue,
      formattedRevenue: formatCurrency(revenue),
      growth: 0,
      productCount: items.length,
      share: 0,
    };
  });
}

export async function fetchProductsData(): Promise<ProductsDataResult> {
  try {
    const products = await api.get<Product[]>("/products");

    if (products.length === 0) {
      return {
        products: [],
        categories: [],
        summary: emptySummary(),
        status: "empty",
        error: null,
      };
    }

    const totalRevenue = products.reduce((s, p) => s + p.price, 0);
    const mapped = products.map((p) => mapProduct(p, totalRevenue));
    const categories = mapCategories(mapped);
    const activeCount = products.filter((p) => p.active).length;
    const withStock = products.filter((p) => p.stock_quantity > 0).length;

    const sorted = [...mapped].sort((a, b) => b.revenue - a.revenue);
    const top = sorted[0];
    const top10Revenue = sorted.slice(0, 10).reduce((s, p) => s + p.revenue, 0);

    const summary: PortfolioSummary = {
      totalProducts: products.length,
      activeProducts: activeCount,
      formattedActiveProducts: String(activeCount),
      categories: categories.length,
      topSku: top?.sku ?? "-",
      topSkuName: top?.name ?? "-",
      topSkuRevenue: top?.formattedRevenue ?? formatCurrency(0),
      averageRevenuePerProduct: formatCurrency(totalRevenue / products.length),
      averageMargin: formatPercentage(
        mapped.reduce((s, p) => s + p.margin, 0) / mapped.length,
      ),
      averageMarginValue: mapped.reduce((s, p) => s + p.margin, 0) / mapped.length,
      top10Concentration: formatPercentage(
        totalRevenue > 0 ? (top10Revenue / totalRevenue) * 100 : 0,
      ),
      top10ConcentrationValue: totalRevenue > 0 ? (top10Revenue / totalRevenue) * 100 : 0,
      totalRevenue: formatCurrency(totalRevenue),
      totalRevenueValue: totalRevenue,
      health: withStock > 0 ? Math.min(100, Math.round((withStock / products.length) * 100)) : 0,
      growth: 0,
    };

    return { products: mapped, categories, summary, status: "success", error: null };
  } catch (e) {
    return {
      products: [],
      categories: [],
      summary: emptySummary(),
      status: "error",
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

function emptySummary(): PortfolioSummary {
  return {
    totalProducts: 0,
    activeProducts: 0,
    formattedActiveProducts: "0",
    categories: 0,
    topSku: "-",
    topSkuName: "-",
    topSkuRevenue: formatCurrency(0),
    averageRevenuePerProduct: formatCurrency(0),
    averageMargin: formatPercentage(0),
    averageMarginValue: 0,
    top10Concentration: formatPercentage(0),
    top10ConcentrationValue: 0,
    totalRevenue: formatCurrency(0),
    totalRevenueValue: 0,
    health: 0,
    growth: 0,
  };
}
