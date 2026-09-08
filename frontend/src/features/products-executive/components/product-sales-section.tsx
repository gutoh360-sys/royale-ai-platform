"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { fetchProductSales, type ProductSales, type SalesPeriod } from "@/services/product-sales";

export function ProductSalesSection() {
  const [period, setPeriod] = useState<SalesPeriod>("30d");
  const [attempt, setAttempt] = useState(0);
  const [data, setData] = useState<ProductSales | null>(null);
  const [state, setState] = useState("loading");
  useEffect(() => {
    let active = true;
    setState("loading");
    fetchProductSales(period, attempt > 0).then((result) => {
      if (active) { setData(result); setState("success"); }
    }).catch(() => { if (active) setState("error"); });
    return () => { active = false; };
  }, [period, attempt]);
  useEffect(() => {
    const refresh = () => setAttempt((value) => value + 1);
    window.addEventListener("products-synced", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("products-synced", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  return <ProductSalesView period={period} onPeriod={setPeriod} data={data} state={state} retry={() => setAttempt((n) => n + 1)} />;
}

const percentage = (value: number | null) => value == null ? "Sem base de calculo" : `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

export function ProductSalesView({ period, onPeriod, data, state, retry }: {
  period: SalesPeriod; onPeriod: (p: SalesPeriod) => void; data: ProductSales | null; state: string; retry: () => void;
}) {
  return <section aria-label="Vendas por produto" className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-sm font-semibold">Vendas por Produto</h2>
      <select aria-label="Periodo de vendas" value={period} onChange={(e) => onPeriod(e.target.value as SalesPeriod)} className="rounded-lg border bg-background p-2 text-sm">
        <option value="today">Hoje</option><option value="7d">7 dias</option><option value="30d">30 dias</option><option value="90d">90 dias</option><option value="12m">12 meses</option>
      </select>
    </div>
    {state === "loading" && <p role="status">Carregando vendas...</p>}
    {state === "error" && <div role="alert">Erro ao carregar vendas. <Button onClick={retry} variant="outline">Tentar novamente</Button></div>}
    {state === "success" && data && <>
      <p className="text-sm text-muted-foreground">{data.coverage === 1 ? "Cobertura completa" : "Cobertura parcial"}: {data.orders_with_items} / {data.eligible_orders} pedidos nao cancelados com itens. Custos conhecidos: {percentage(data.cost_coverage == null ? null : data.cost_coverage * 100)} da receita. Margem calculada apenas sobre itens com custo positivo cadastrado.</p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {[["Receita", formatCurrency(data.total_revenue)], ["Margem ponderada", percentage(data.average_margin)], ["Crescimento", percentage(data.growth)], ["Top SKU", data.top_sku ?? "Sem vendas"], ["Quantidade", String(data.quantity)], ["Pedidos", String(data.total_orders)]].map(([label, value]) => <Card key={label}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></CardContent></Card>)}
      </div>
      <div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[600px] text-sm">
        <caption className="p-3 text-left font-medium">Top 10 por receita</caption>
        <thead><tr>{["SKU", "Produto", "Receita", "Quantidade", "Pedidos", "Margem"].map((h) => <th key={h} className="p-3 text-left">{h}</th>)}</tr></thead>
        <tbody>{data.top10.map((p) => <tr key={p.id} className="border-t"><td className="p-3">{p.sku}</td><td className="p-3">{p.name}</td><td className="p-3">{formatCurrency(p.total_revenue)}</td><td className="p-3">{p.quantity}</td><td className="p-3">{p.order_count}</td><td className="p-3">{percentage(p.margin)}</td></tr>)}</tbody>
      </table>{data.top10.length === 0 && <p className="p-3">Sem vendas com itens neste periodo.</p>}</div>
      {data.sold_out.length > 0 && <p className="text-sm">Produtos vendidos no periodo e sem estoque: {data.sold_out.map((p) => p.sku).join(", ")}. Avalie reposicao.</p>}
    </>}
  </section>;
}
