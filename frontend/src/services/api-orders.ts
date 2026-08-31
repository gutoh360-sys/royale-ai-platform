import { api } from "@/lib/api";
import { toNumber } from "@/lib/api-values";
import { formatCurrency } from "@/lib/format";
import type { AnalyticsPeriodDays, Order, DashboardAnalytics } from "@/types/api";
import { buildSalesInsights, buildSalesRecommendations } from "@/features/sales-executive/utils/sales-insights";
import type {
  SalesCharts,
  SalesData,
  SalesDataResult,
  SalesExecutive,
  SalesPeriodComparison,
  RevenueEntry,
  OrderEntry,
} from "@/features/sales-executive/types";

function mapSalesData(orders: Order[], analytics: DashboardAnalytics, days: AnalyticsPeriodDays): SalesData {
  const now = new Date();
  const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const revenue = toNumber(analytics.revenue);
  const averageTicket = toNumber(analytics.average_ticket);
  const health = analytics.total_orders > 0
    ? Math.min(
        100,
        Math.round(
          (toNumber(analytics.orders_by_status?.completed) / analytics.total_orders) * 100,
        ),
      )
    : 0;

  return {
    revenue,
    formattedRevenue: formatCurrency(revenue),
    orders: analytics.total_orders,
    formattedOrders: String(analytics.total_orders),
    averageTicket,
    formattedAverageTicket: formatCurrency(averageTicket),
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
    value: toNumber(s.revenue),
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
      api.get<DashboardAnalytics>(`/analytics/dashboard?days=${days}`),
    ]);

    const sales = mapSalesData(orders, analytics, days);
    return { sales, status: "success", error: null };
  } catch (e) {
    return { sales: null, status: "error", error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function fetchSalesCharts(days: AnalyticsPeriodDays = 7): Promise<SalesCharts> {
  try {
    const analytics = await api.get<DashboardAnalytics>(`/analytics/dashboard?days=${days}`);
    return mapCharts(analytics);
  } catch {
    return { revenueTrend: [], orderTrend: [] };
  }
}

function buildPeriodComparison(sales: SalesData): SalesPeriodComparison {
  return {
    revenue: { current: sales.revenue, previous: 0, change: 0 },
    orders: { current: sales.orders, previous: 0, change: 0 },
    averageTicket: { current: sales.averageTicket, previous: 0, change: 0 },
    conversionRate: { current: sales.conversionRate, previous: 0, change: 0 },
  };
}

export async function fetchSalesExecutiveData(days: AnalyticsPeriodDays = 30): Promise<SalesExecutive> {
  const [salesResult, charts] = await Promise.all([
    fetchSalesData(days),
    fetchSalesCharts(days),
  ]);

  if (salesResult.status !== "success" || !salesResult.sales) {
    throw new Error(salesResult.error ?? "Sales data unavailable");
  }

  return {
    data: salesResult.sales,
    charts,
    insights: buildSalesInsights(salesResult.sales),
    recommendations: buildSalesRecommendations(salesResult.sales),
    comparison: buildPeriodComparison(salesResult.sales),
    lastUpdated: new Date().toISOString(),
  };
}
