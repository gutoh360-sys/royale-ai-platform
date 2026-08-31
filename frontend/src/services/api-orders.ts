import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import type { Order, DashboardAnalytics } from "@/types/api";
import type { SalesData, SalesDataResult, SalesCharts, RevenueEntry, OrderEntry } from "@/features/sales-executive/types";

function mapSalesData(orders: Order[], analytics: DashboardAnalytics): SalesData {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  return {
    revenue: analytics.revenue,
    formattedRevenue: formatCurrency(analytics.revenue),
    orders: analytics.total_orders,
    formattedOrders: String(analytics.total_orders),
    averageTicket: analytics.average_ticket ?? 0,
    formattedAverageTicket: formatCurrency(analytics.average_ticket ?? 0),
    conversionRate: 0,
    formattedConversionRate: "0%",
    productsSold: 0,
    formattedProductsSold: "0",
    customersServed: new Set(orders.map((o) => o.customer_name)).size,
    formattedCustomersServed: String(new Set(orders.map((o) => o.customer_name)).size),
    growth: 0,
    formattedGrowth: "0%",
    health: analytics.total_orders > 0 ? 85 : 0,
    formattedHealth: analytics.total_orders > 0 ? "85%" : "0%",
    period: {
      start: thirtyDaysAgo.toISOString().split("T")[0],
      end: now.toISOString().split("T")[0],
      label: "Últimos 30 dias",
    },
  };
}

function mapCharts(analytics: DashboardAnalytics): SalesCharts {
  const revenueTrend: RevenueEntry[] = analytics.sales_by_period.map((s) => ({
    date: s.day,
    value: s.revenue,
    label: s.day,
  }));

  const orderTrend: OrderEntry[] = analytics.sales_by_period.map((s) => ({
    date: s.day,
    value: s.total_orders,
    label: s.day,
  }));

  return { revenueTrend, orderTrend };
}

export async function fetchSalesData(): Promise<SalesDataResult> {
  try {
    const [orders, analytics] = await Promise.all([
      api.get<Order[]>("/orders"),
      api.get<DashboardAnalytics>("/api/analytics?days=30"),
    ]);

    const sales = mapSalesData(orders, analytics);
    return { sales, status: "success", error: null };
  } catch (e) {
    return { sales: null, status: "error", error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function fetchSalesCharts(): Promise<SalesCharts> {
  try {
    const analytics = await api.get<DashboardAnalytics>("/api/analytics?days=30");
    return mapCharts(analytics);
  } catch {
    return { revenueTrend: [], orderTrend: [] };
  }
}
