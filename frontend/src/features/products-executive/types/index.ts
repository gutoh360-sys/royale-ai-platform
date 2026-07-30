export interface ProductPerformance {
  id: string
  name: string
  sku: string
  category: string
  revenue: number
  formattedRevenue: string
  orders: number
  formattedOrders: string
  margin: number
  formattedMargin: string
  growth: number
  share: number
  formattedShare: string
  status: "star" | "cash_cow" | "question_mark" | "dog"
}

export interface CategoryData {
  name: string
  revenue: number
  formattedRevenue: string
  growth: number
  productCount: number
  share: number
}

export interface PortfolioSummary {
  totalProducts: number
  activeProducts: number
  formattedActiveProducts: string
  categories: number
  topSku: string
  topSkuName: string
  topSkuRevenue: string
  averageRevenuePerProduct: string
  averageMargin: string
  averageMarginValue: number
  top10Concentration: string
  top10ConcentrationValue: number
  totalRevenue: string
  totalRevenueValue: number
  health: number
  growth: number
}

export type ProductsState = "loading" | "success" | "empty" | "error"

export interface ProductsDataResult {
  products: ProductPerformance[]
  categories: CategoryData[]
  summary: PortfolioSummary
  status: ProductsState
  error: string | null
}
