import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import type { AnalyticsPeriodDays, Order, DashboardAnalytics } from "@/types/api";
import type { SalesData, SalesDataResult, SalesCharts, RevenueEntry, OrderEntry } from "@/features/sales-executive/types";

function mapSalesData(orders: Order[], analytics: DashboardAnalytics, days: AnalyticsPeriodDays): SalesData {
  const now = new Date();
  const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const health = analytics.total_orders > 0
    ? Math.min(
        100,
        Math.round(
          ((analytics.orders_by_status?.completed ?? 0) / analytics.total_orders) * 100,
        ),
      )
    : 0;

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
    health,
    formattedHealth: `${health}%`,
    period: {
      start: periodStart.toISOString().split("T")[0],
      end: now.toISOString().split("T")[0],
      label: `Últimos ${days} dias`,
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

export async function fetchSalesData(days: AnalyticsPeriodDays = 7): Promise<SalesDataResult> {
  try {
    const [orders, analytics] = await Promise.all([
      api.get<Order[]>("/orders"),
      api.get<DashboardAnalytics>(`/api/analytics?days=${days}`),
    ]);

    const sales = mapSalesData(orders, analytics, days);
    return { sales, status: "success", error: null };
  } catch (e) {
    return { sales: null, status: "error", error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function fetchSalesCharts(days: AnalyticsPeriodDays = 7): Promise<SalesCharts> {
  try {
    const analytics = await api.get<DashboardAnalytics>(`/api/analytics?days=${days}`);
    return mapCharts(analytics);
  } catch {
    return { revenueTrend: [], orderTrend: [] };
  }
}
