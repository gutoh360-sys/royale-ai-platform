import type { SalesDataResult, SalesData } from "../types"

export class MockSalesDataService {
  async fetch(): Promise<SalesDataResult> {
    await new Promise((r) => setTimeout(r, 600))
    const sales: SalesData = {
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
      period: { start: "2026-01-01", end: "2026-01-31", label: "Últimos 30 dias" },
    }
    return { sales, status: "success", error: null }
  }
}
