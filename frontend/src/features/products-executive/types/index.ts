export interface ProductCatalogItem {
  id: string
  name: string
  sku: string
  ean: string | null
  brand: string
  category: string
  price: number
  formattedPrice: string
  stockQuantity: number
  active: boolean
  formattedLastSyncedAt: string
}

export interface CountDistributionItem {
  name: string
  count: number
}

export interface PortfolioSummary {
  totalProducts: number
  activeProducts: number
  formattedActiveProducts: string
  outOfStockProducts: number
  totalStock: number
  averageRegisteredPrice: string
  productsWithPrice: number
  brands: number
  categories: number
  topSku: string
  topSkuName: string
  topSkuRevenue: string
  averageRevenuePerProduct: string
  averageMargin: string
  top10Concentration: string
  totalRevenue: string
  growth: string
}

export type ProductPerformance = ProductCatalogItem
export type CategoryData = CountDistributionItem

export type ProductsState = "loading" | "success" | "empty" | "error"

export interface ProductsDataResult {
  products: ProductCatalogItem[]
  stockDistribution: CountDistributionItem[]
  brandDistribution: CountDistributionItem[]
  categoryDistribution: CountDistributionItem[]
  statusDistribution: CountDistributionItem[]
  summary: PortfolioSummary
  salesAnalytics: null
  status: ProductsState
  error: string | null
}
