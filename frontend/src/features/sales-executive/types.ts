export interface SalesData {
  revenue: number
  formattedRevenue: string
  orders: number
  formattedOrders: string
  averageTicket: number
  formattedAverageTicket: string
  conversionRate: number
  formattedConversionRate: string
  productsSold: number
  formattedProductsSold: string
  customersServed: number
  formattedCustomersServed: string
  growth: number
  formattedGrowth: string
  health: number
  formattedHealth: string
  period: {
    start: string
    end: string
    label: string
  }
}

export type SalesState = "loading" | "success" | "empty" | "error"

export interface SalesDataResult {
  sales: SalesData | null
  status: SalesState
  error: string | null
}

export interface RevenueEntry {
  date: string
  value: number
  label: string
}

export interface OrderEntry {
  date: string
  value: number
  label: string
}

export interface SalesInsight {
  type: "success" | "warning" | "danger" | "info"
  title: string
  description: string
  metric?: string
}

export interface SalesRecommendation {
  id: string
  title: string
  description: string
  impact: "high" | "medium" | "low"
  effort: "high" | "medium" | "low"
  category: string
}

export interface SalesPeriodComparison {
  revenue: { current: number; previous: number; change: number }
  orders: { current: number; previous: number; change: number }
  averageTicket: { current: number; previous: number; change: number }
  conversionRate: { current: number; previous: number; change: number }
}

export interface SalesCharts {
  revenueTrend: RevenueEntry[]
  orderTrend: OrderEntry[]
}

export interface SalesExecutive {
  data: SalesData
  charts: SalesCharts
  insights: SalesInsight[]
  recommendations: SalesRecommendation[]
  comparison: SalesPeriodComparison
  lastUpdated: string
}
