import { api } from "@/lib/api";
import { toNumber } from "@/lib/api-values";
import { formatCurrency } from "@/lib/format";
import type { Product } from "@/types/api";
import type {
  ProductCatalogItem,
  CountDistributionItem,
  PortfolioSummary,
  ProductsDataResult,
} from "@/features/products-executive/types";

const SALES_UNAVAILABLE = "N/D";

type ProductWithOptionalCategory = Product & {
  category?: { name?: unknown } | null;
  category_name?: unknown;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function realText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || isUuid(trimmed)) return null;
  return trimmed;
}

function resolveCategory(product: ProductWithOptionalCategory) {
  return realText(product.category_name) ?? realText(product.category?.name) ?? "Sem categoria";
}

function resolveBrand(brand: string | null) {
  return realText(brand) ?? "Sem marca";
}

function formatDate(value: string | null) {
  if (!value) return "N/D";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/D";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function mapProduct(product: ProductWithOptionalCategory): ProductCatalogItem {
  const price = toNumber(product.price);

  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    ean: product.ean,
    brand: resolveBrand(product.brand),
    category: resolveCategory(product),
    price,
    formattedPrice: price > 0 ? formatCurrency(price) : "N/D",
    stockQuantity: product.stock_quantity,
    active: product.active,
    formattedLastSyncedAt: formatDate(product.last_synced_at),
  };
}

function countBy(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"));
}

function stockDistribution(products: ProductCatalogItem[]): CountDistributionItem[] {
  const ranges = [
    { name: "Sem estoque", count: 0, match: (value: number) => value <= 0 },
    { name: "1-5 unidades", count: 0, match: (value: number) => value >= 1 && value <= 5 },
    { name: "6-20", count: 0, match: (value: number) => value >= 6 && value <= 20 },
    { name: "21-50", count: 0, match: (value: number) => value >= 21 && value <= 50 },
    { name: "50+", count: 0, match: (value: number) => value > 50 },
  ];

  for (const product of products) {
    const range = ranges.find((item) => item.match(product.stockQuantity));
    if (range) range.count += 1;
  }

  return ranges.map(({ name, count }) => ({ name, count }));
}

function emptySummary(): PortfolioSummary {
  return {
    totalProducts: 0,
    activeProducts: 0,
    formattedActiveProducts: "0",
    outOfStockProducts: 0,
    totalStock: 0,
    averageRegisteredPrice: SALES_UNAVAILABLE,
    productsWithPrice: 0,
    brands: 0,
    categories: 0,
    topSku: SALES_UNAVAILABLE,
    topSkuName: SALES_UNAVAILABLE,
    topSkuRevenue: SALES_UNAVAILABLE,
    averageRevenuePerProduct: SALES_UNAVAILABLE,
    averageMargin: SALES_UNAVAILABLE,
    top10Concentration: SALES_UNAVAILABLE,
    totalRevenue: SALES_UNAVAILABLE,
    growth: SALES_UNAVAILABLE,
  };
}

function buildSummary(products: ProductCatalogItem[]): PortfolioSummary {
  const productsWithPrice = products.filter((product) => product.price > 0);
  const averagePrice = productsWithPrice.length > 0
    ? formatCurrency(productsWithPrice.reduce((sum, product) => sum + product.price, 0) / productsWithPrice.length)
    : SALES_UNAVAILABLE;
  const realCategoryCount = new Set(products.filter((product) => product.category !== "Sem categoria").map((product) => product.category)).size;
  const realBrandCount = new Set(products.filter((product) => product.brand !== "Sem marca").map((product) => product.brand)).size;

  return {
    ...emptySummary(),
    totalProducts: products.length,
    activeProducts: products.filter((product) => product.active).length,
    formattedActiveProducts: String(products.filter((product) => product.active).length),
    outOfStockProducts: products.filter((product) => product.stockQuantity <= 0).length,
    totalStock: products.reduce((sum, product) => sum + product.stockQuantity, 0),
    averageRegisteredPrice: averagePrice,
    productsWithPrice: productsWithPrice.length,
    brands: realBrandCount,
    categories: realCategoryCount,
  };
}

export async function fetchProductsData(): Promise<ProductsDataResult> {
  try {
    const data = await api.get<ProductWithOptionalCategory[]>("/products");

    if (data.length === 0) {
      return {
        products: [],
        stockDistribution: stockDistribution([]),
        brandDistribution: [],
        categoryDistribution: [],
        statusDistribution: [
          { name: "Ativos", count: 0 },
          { name: "Inativos", count: 0 },
        ],
        summary: emptySummary(),
        salesAnalytics: null,
        status: "empty",
        error: null,
      };
    }

    const mapped = data.map(mapProduct);

    return {
      products: mapped,
      stockDistribution: stockDistribution(mapped),
      brandDistribution: countBy(mapped.map((product) => product.brand)),
      categoryDistribution: countBy(mapped.map((product) => product.category)),
      statusDistribution: [
        { name: "Ativos", count: mapped.filter((product) => product.active).length },
        { name: "Inativos", count: mapped.filter((product) => !product.active).length },
      ],
      summary: buildSummary(mapped),
      salesAnalytics: null,
      status: "success",
      error: null,
    };
  } catch (e) {
    return {
      products: [],
      stockDistribution: stockDistribution([]),
      brandDistribution: [],
      categoryDistribution: [],
      statusDistribution: [
        { name: "Ativos", count: 0 },
        { name: "Inativos", count: 0 },
      ],
      summary: emptySummary(),
      salesAnalytics: null,
      status: "error",
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}
