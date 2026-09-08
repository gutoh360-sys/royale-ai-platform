import type { ProductCatalogItem } from "@/features/products-executive/types";

export const PRODUCTS_PAGE_SIZE = 50;

export type ProductStatusFilter = "all" | "active" | "inactive";
export type ProductStockFilter = "all" | "in" | "out";

export interface ProductFilters {
  search?: string;
  status?: ProductStatusFilter;
  stock?: ProductStockFilter;
  brand?: string;
  category?: string;
}

export function filterProducts(
  products: ProductCatalogItem[],
  filters: ProductFilters,
): ProductCatalogItem[] {
  const search = filters.search?.trim().toLowerCase() ?? "";
  const status = filters.status ?? "all";
  const stock = filters.stock ?? "all";
  const brand = filters.brand ?? "all";
  const category = filters.category ?? "all";

  return products.filter((product) => {
    const searchable = `${product.sku} ${product.name} ${product.ean ?? ""}`.toLowerCase();
    if (search && !searchable.includes(search)) return false;
    if (status === "active" && !product.active) return false;
    if (status === "inactive" && product.active) return false;
    if (stock === "in" && product.stockQuantity <= 0) return false;
    if (stock === "out" && product.stockQuantity > 0) return false;
    if (brand !== "all" && product.brand !== brand) return false;
    if (category !== "all" && product.category !== category) return false;
    return true;
  });
}

export function paginateProducts(products: ProductCatalogItem[], requestedPage: number) {
  const totalPages = Math.max(1, Math.ceil(products.length / PRODUCTS_PAGE_SIZE));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const start = (page - 1) * PRODUCTS_PAGE_SIZE;

  return {
    page,
    totalPages,
    start,
    end: Math.min(start + PRODUCTS_PAGE_SIZE, products.length),
    items: products.slice(start, start + PRODUCTS_PAGE_SIZE),
  };
}

export function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, "pt-BR"));
}
