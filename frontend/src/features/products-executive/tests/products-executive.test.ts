import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ProductCatalogItem } from "@/features/products-executive/types";
import {
  filterProducts,
  paginateProducts,
  PRODUCTS_PAGE_SIZE,
} from "@/features/products-executive/utils/catalog-view";

const featureRoot = resolve(__dirname, "..");

const catalogProducts: ProductCatalogItem[] = [
  {
    id: "1",
    sku: "SKU-001",
    ean: "7890000000011",
    name: "Produto Alpha",
    brand: "Marca A",
    category: "Sem categoria",
    price: 100,
    formattedPrice: "R$ 100,00",
    stockQuantity: 0,
    active: true,
    formattedLastSyncedAt: "01/08/2026, 10:00",
  },
  {
    id: "2",
    sku: "SKU-002",
    ean: null,
    name: "Produto Beta",
    brand: "Marca B",
    category: "Acessórios",
    price: 50,
    formattedPrice: "R$ 50,00",
    stockQuantity: 12,
    active: false,
    formattedLastSyncedAt: "N/D",
  },
];

describe("products page real-data constraints", () => {
  it("does not keep products mock files in the feature", () => {
    expect(existsSync(resolve(featureRoot, "mocks/index.ts"))).toBe(false);
  });

  it("does not render fake sales calculations while order_items are unavailable", () => {
    const pageSource = readFileSync(resolve(featureRoot, "components/products-detail-page.tsx"), "utf8");

    expect(pageSource).not.toContain("Receita Total");
    expect(pageSource).not.toContain("Saúde do Portfólio");
    expect(pageSource).not.toContain("Performance por Produto");
    expect(pageSource).toContain("Preço Médio Cadastrado");
    expect(pageSource).toContain("Receita por Produto");
    expect(pageSource).toContain("N/D");
    expect(pageSource).toContain("Aguardando integração dos itens dos pedidos");
  });

  it("never imports mock products data from the page path", () => {
    const pageSource = readFileSync(resolve(featureRoot, "components/products-detail-page.tsx"), "utf8");
    const hookSource = readFileSync(resolve(featureRoot, "hooks/use-products-data.ts"), "utf8");

    expect(`${pageSource}\n${hookSource}`).not.toMatch(/products-executive\/mocks|MockProductsDataService|mockProducts|mockCategories|fake|sample/);
  });
});

describe("catalog table filtering and pagination", () => {
  it("searches by SKU, name, and EAN", () => {
    expect(filterProducts(catalogProducts, { search: "SKU-001" }).map((p) => p.id)).toEqual(["1"]);
    expect(filterProducts(catalogProducts, { search: "beta" }).map((p) => p.id)).toEqual(["2"]);
    expect(filterProducts(catalogProducts, { search: "7890000000011" }).map((p) => p.id)).toEqual(["1"]);
  });

  it("filters by active status, stock availability, brand, and category", () => {
    expect(filterProducts(catalogProducts, { status: "active" }).map((p) => p.id)).toEqual(["1"]);
    expect(filterProducts(catalogProducts, { status: "inactive" }).map((p) => p.id)).toEqual(["2"]);
    expect(filterProducts(catalogProducts, { stock: "out" }).map((p) => p.id)).toEqual(["1"]);
    expect(filterProducts(catalogProducts, { stock: "in" }).map((p) => p.id)).toEqual(["2"]);
    expect(filterProducts(catalogProducts, { brand: "Marca B" }).map((p) => p.id)).toEqual(["2"]);
    expect(filterProducts(catalogProducts, { category: "Acessórios" }).map((p) => p.id)).toEqual(["2"]);
  });

  it("uses 50 products per visual page", () => {
    const manyProducts = Array.from({ length: 121 }, (_, index) => ({
      ...catalogProducts[0],
      id: String(index + 1),
      sku: `SKU-${index + 1}`,
    }));

    expect(PRODUCTS_PAGE_SIZE).toBe(50);
    expect(paginateProducts(manyProducts, 1).items).toHaveLength(50);
    expect(paginateProducts(manyProducts, 3).items).toHaveLength(21);
    expect(paginateProducts(manyProducts, 99).page).toBe(3);
  });
});
