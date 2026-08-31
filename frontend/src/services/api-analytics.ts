import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import type { DashboardAnalytics } from "@/types/api";
import type { ExecutiveMetric } from "@/features/dashboard/executive-summary/types";
import { Package, ShoppingCart, TrendingUp, DollarSign } from "lucide-react";

export async function fetchDashboardAnalytics(): Promise<DashboardAnalytics> {
  return api.get<DashboardAnalytics>("/api/analytics?days=30");
}

export function mapToMetrics(data: DashboardAnalytics): ExecutiveMetric[] {
  return [
    {
      id: "revenue",
      label: "Receita",
      value: data.revenue,
      formattedValue: formatCurrency(data.revenue),
      variation: 0,
      trend: "neutral",
      comparisonLabel: "últimos 30 dias",
      icon: DollarSign,
    },
    {
      id: "orders",
      label: "Pedidos",
      value: data.total_orders,
      formattedValue: String(data.total_orders),
      variation: 0,
      trend: "neutral",
      comparisonLabel: "últimos 30 dias",
      icon: ShoppingCart,
    },
    {
      id: "products",
      label: "Produtos Ativos",
      value: data.active_products,
      formattedValue: String(data.active_products),
      variation: 0,
      trend: "neutral",
      comparisonLabel: `de ${data.total_products} total`,
      icon: Package,
    },
    {
      id: "ticket",
      label: "Ticket Médio",
      value: data.average_ticket ?? 0,
      formattedValue: formatCurrency(data.average_ticket ?? 0),
      variation: 0,
      trend: "neutral",
      comparisonLabel: "por pedido",
      icon: TrendingUp,
    },
  ];
}
