import type { SalesExecutive, SalesPeriodComparison, SalesCharts } from "./types"
import { buildSalesInsights, buildSalesRecommendations } from "./utils/sales-insights"

const now = new Date()
const endDate = now.toISOString().split("T")[0]
const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0]

export function buildMockSalesExecutive(): SalesExecutive {
  const data = {
    revenue: 278400,
    formattedRevenue: "R$ 278,4k",
    orders: 2310,
    formattedOrders: "2.310",
    averageTicket: 120.52,
    formattedAverageTicket: "R$ 120,52",
    conversionRate: 0.052,
    formattedConversionRate: "5,2%",
    productsSold: 142,
    formattedProductsSold: "142",
    customersServed: 1890,
    formattedCustomersServed: "1.890",
    growth: 12,
    formattedGrowth: "12%",
    health: 82,
    formattedHealth: "82%",
    period: { start: startDate, end: endDate, label: "Últimos 30 dias" },
  }
  return {
    data,
    charts: buildMockCharts(),
    insights: buildSalesInsights(data),
    recommendations: buildSalesRecommendations(data),
    comparison: buildMockComparison(),
    lastUpdated: now.toISOString(),
  }
}

function buildMockCharts(): SalesCharts {
  const revenueTrend = [
    { date: "2026-01-01", value: 8200, label: "01 Jan" },
    { date: "2026-01-02", value: 9100, label: "02 Jan" },
    { date: "2026-01-03", value: 7800, label: "03 Jan" },
    { date: "2026-01-04", value: 6500, label: "04 Jan" },
    { date: "2026-01-05", value: 10200, label: "05 Jan" },
    { date: "2026-01-06", value: 11500, label: "06 Jan" },
    { date: "2026-01-07", value: 9800, label: "07 Jan" },
    { date: "2026-01-08", value: 10500, label: "08 Jan" },
    { date: "2026-01-09", value: 8900, label: "09 Jan" },
    { date: "2026-01-10", value: 12300, label: "10 Jan" },
    { date: "2026-01-11", value: 11100, label: "11 Jan" },
    { date: "2026-01-12", value: 7400, label: "12 Jan" },
    { date: "2026-01-13", value: 9600, label: "13 Jan" },
    { date: "2026-01-14", value: 8700, label: "14 Jan" },
    { date: "2026-01-15", value: 13400, label: "15 Jan" },
  ]

  const orderTrend = [
    { date: "2026-01-01", value: 68, label: "01 Jan" },
    { date: "2026-01-02", value: 75, label: "02 Jan" },
    { date: "2026-01-03", value: 62, label: "03 Jan" },
    { date: "2026-01-04", value: 51, label: "04 Jan" },
    { date: "2026-01-05", value: 88, label: "05 Jan" },
    { date: "2026-01-06", value: 96, label: "06 Jan" },
    { date: "2026-01-07", value: 81, label: "07 Jan" },
    { date: "2026-01-08", value: 92, label: "08 Jan" },
    { date: "2026-01-09", value: 74, label: "09 Jan" },
    { date: "2026-01-10", value: 108, label: "10 Jan" },
    { date: "2026-01-11", value: 95, label: "11 Jan" },
    { date: "2026-01-12", value: 59, label: "12 Jan" },
    { date: "2026-01-13", value: 78, label: "13 Jan" },
    { date: "2026-01-14", value: 71, label: "14 Jan" },
    { date: "2026-01-15", value: 115, label: "15 Jan" },
  ]

  return { revenueTrend, orderTrend }
}

function buildMockComparison(): SalesPeriodComparison {
  return {
    revenue: { current: 278400, previous: 248200, change: 12 },
    orders: { current: 2310, previous: 2100, change: 10 },
    averageTicket: { current: 120.52, previous: 118.19, change: 2 },
    conversionRate: { current: 0.052, previous: 0.048, change: 8.3 },
  }
}
