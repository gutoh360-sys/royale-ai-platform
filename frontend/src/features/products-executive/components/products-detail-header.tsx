"use client";

import type { PortfolioSummary } from "@/features/products-executive/types";

interface ProductsDetailHeaderProps {
  summary: PortfolioSummary;
}

export function ProductsDetailHeader({ summary }: ProductsDetailHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
            P
          </div>
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Produtos
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.totalProducts.toLocaleString("pt-BR")} produtos reais sincronizados do Bling
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <HeaderMetric label="Produtos Ativos" value={summary.activeProducts.toLocaleString("pt-BR")} />
          <Divider />
          <HeaderMetric label="Disponibilidade de Estoque" value={`${summary.outOfStockProducts.toLocaleString("pt-BR")} sem estoque`} />
          <Divider />
          <HeaderMetric label="Preço Médio Cadastrado" value={summary.averageRegisteredPrice} />
        </div>
      </div>
    </div>
  );
}

function HeaderMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function Divider() {
  return <div className="hidden h-8 w-px bg-border sm:block" aria-hidden="true" />;
}
