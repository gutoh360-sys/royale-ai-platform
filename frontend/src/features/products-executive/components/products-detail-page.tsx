"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Package, Search } from "lucide-react";
import { ContentContainer } from "@/components/shell/content-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductsDetailHeader } from "./products-detail-header";
import { ProductsDetailSkeleton } from "./products-detail-skeleton";
import { ProductSalesSection } from "./product-sales-section";
import { useProductsData } from "@/features/products-executive/hooks/use-products-data";
import type { CountDistributionItem } from "@/features/products-executive/types";
import {
  filterProducts,
  paginateProducts,
  uniqueSorted,
  type ProductStatusFilter,
  type ProductStockFilter,
} from "@/features/products-executive/utils/catalog-view";

export function ProductsDetailPage() {
  const {
    products,
    stockDistribution,
    brandDistribution,
    categoryDistribution,
    statusDistribution,
    summary,
    status,
    retry,
  } = useProductsData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>("all");
  const [stockFilter, setStockFilter] = useState<ProductStockFilter>("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);

  const brandOptions = useMemo(() => uniqueSorted(products.map((product) => product.brand)), [products]);
  const categoryOptions = useMemo(() => uniqueSorted(products.map((product) => product.category)), [products]);

  const filteredProducts = useMemo(
    () => filterProducts(products, {
      search,
      status: statusFilter,
      stock: stockFilter,
      brand: brandFilter,
      category: categoryFilter,
    }),
    [products, search, statusFilter, stockFilter, brandFilter, categoryFilter],
  );

  const paged = useMemo(() => paginateProducts(filteredProducts, page), [filteredProducts, page]);

  function resetPage() {
    setPage(1);
  }

  if (status === "loading") {
    return (
      <ContentContainer>
        <ProductsDetailSkeleton />
      </ContentContainer>
    );
  }

  if (status === "error") {
    return (
      <ContentContainer>
        <div className="flex min-h-[400px] items-center justify-center gap-2">
          <AlertCircle className="size-5 text-destructive" />
          <p className="text-sm text-muted-foreground">Erro ao carregar dados reais de produtos</p>
          <Button variant="outline" onClick={retry}>Tentar novamente</Button>
        </div>
      </ContentContainer>
    );
  }

  if (products.length === 0) {
    return (
      <ContentContainer>
        <div className="flex min-h-[400px] items-center justify-center gap-2">
          <AlertCircle className="size-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum produto encontrado no catálogo</p>
        </div>
      </ContentContainer>
    );
  }

  return (
    <ContentContainer>
      <div className="animate-in fade-in space-y-8 duration-300">
        <ProductsDetailHeader summary={summary} />

        <Card>
          <CardContent className="space-y-2 p-5">
            <p className="text-sm font-medium">Catálogo sincronizado com o Bling</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Vendas calculadas a partir dos itens vinculados aos pedidos. A cobertura indica quanto do período já foi integrado.
            </p>
          </CardContent>
        </Card>

        <section aria-label="Indicadores reais do catálogo">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Indicadores do Catálogo
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <KpiCard label="Produtos Totais" value={formatInteger(summary.totalProducts)} />
            <KpiCard label="Produtos Ativos" value={formatInteger(summary.activeProducts)} />
            <KpiCard label="Sem Estoque" value={formatInteger(summary.outOfStockProducts)} />
            <KpiCard label="Estoque Total" value={formatInteger(summary.totalStock)} />
            <KpiCard label="Preço Médio Cadastrado" value={summary.averageRegisteredPrice} />
            <KpiCard label="Com Preço Cadastrado" value={formatInteger(summary.productsWithPrice)} />
            <KpiCard label="Marcas" value={formatInteger(summary.brands)} />
            <KpiCard label="Categorias" value={formatInteger(summary.categories)} />
          </div>
        </section>

        <ProductSalesSection />

        <section aria-label="Gráficos reais do catálogo">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Distribuições do Catálogo
          </h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <CountDistributionCard title="Distribuição de Estoque" data={stockDistribution} />
            <CountDistributionCard title="Produtos por Categoria" data={categoryDistribution} />
            <CountDistributionCard title="Produtos por Marca" data={brandDistribution} />
            <CountDistributionCard title="Status do Catálogo" data={statusDistribution} />
          </div>
        </section>

        <section aria-label="Catálogo de produtos">
          <div className="mb-3 flex items-center gap-2">
            <Package className="size-4 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Produtos
            </h2>
          </div>
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.5fr_repeat(4,minmax(0,1fr))]">
                <label className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-2 size-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      resetPage();
                    }}
                    placeholder="Buscar por SKU, produto ou EAN"
                    className="pl-8"
                  />
                </label>
                <CatalogSelect value={statusFilter} onChange={(value) => { setStatusFilter(value as ProductStatusFilter); resetPage(); }}>
                  <option value="all">Todos os status</option>
                  <option value="active">Ativos</option>
                  <option value="inactive">Inativos</option>
                </CatalogSelect>
                <CatalogSelect value={stockFilter} onChange={(value) => { setStockFilter(value as ProductStockFilter); resetPage(); }}>
                  <option value="all">Todo estoque</option>
                  <option value="in">Com estoque</option>
                  <option value="out">Sem estoque</option>
                </CatalogSelect>
                <CatalogSelect value={brandFilter} onChange={(value) => { setBrandFilter(value); resetPage(); }}>
                  <option value="all">Todas as marcas</option>
                  {brandOptions.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
                </CatalogSelect>
                <CatalogSelect value={categoryFilter} onChange={(value) => { setCategoryFilter(value); resetPage(); }}>
                  <option value="all">Todas as categorias</option>
                  {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
                </CatalogSelect>
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">SKU</th>
                      <th className="px-3 py-2 font-medium">Produto</th>
                      <th className="px-3 py-2 font-medium">Marca</th>
                      <th className="px-3 py-2 font-medium">Categoria</th>
                      <th className="px-3 py-2 font-medium">Preço cadastrado</th>
                      <th className="px-3 py-2 font-medium">Estoque</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Última sincronização</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.items.map((product) => (
                      <tr key={product.id} className="border-t">
                        <td className="px-3 py-2 font-mono text-xs">{product.sku}</td>
                        <td className="px-3 py-2">
                          <div className="font-medium">{product.name}</div>
                          <div className="text-xs text-muted-foreground">EAN: {product.ean ?? "N/D"}</div>
                        </td>
                        <td className="px-3 py-2">{product.brand}</td>
                        <td className="px-3 py-2">{product.category}</td>
                        <td className="px-3 py-2">{product.formattedPrice}</td>
                        <td className="px-3 py-2">{formatInteger(product.stockQuantity)}</td>
                        <td className="px-3 py-2">
                          <Badge variant={product.active ? "default" : "secondary"}>
                            {product.active ? "Ativo" : "Inativo"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">{product.formattedLastSyncedAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Exibindo {filteredProducts.length === 0 ? 0 : paged.start + 1}-{paged.end} de {formatInteger(filteredProducts.length)} produtos filtrados
                </span>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" disabled={paged.page <= 1} onClick={() => setPage((value) => value - 1)}>
                    Anterior
                  </Button>
                  <span>Página {paged.page} de {paged.totalPages}</span>
                  <Button size="sm" variant="outline" disabled={paged.page >= paged.totalPages} onClick={() => setPage((value) => value + 1)}>
                    Próxima
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </ContentContainer>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="mb-1 text-[11px] text-muted-foreground">{label}</p>
        <p className="font-heading text-lg font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

function CountDistributionCard({ title, data }: { title: string; data: CountDistributionItem[] }) {
  const max = Math.max(...data.map((item) => item.count), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.map((item) => (
          <div key={item.name} className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-muted-foreground">{item.name}</span>
              <span className="font-medium">{formatInteger(item.count)}</span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div className="h-2 rounded-full bg-primary" style={{ width: `${(item.count / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CatalogSelect({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {children}
    </select>
  );
}

function formatInteger(value: number) {
  return value.toLocaleString("pt-BR");
}
