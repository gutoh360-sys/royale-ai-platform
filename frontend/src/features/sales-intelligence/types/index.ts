import type { InventoryAnalysis } from "@/features/inventory-intelligence/types"

export type OpportunityType = "increase_ads" | "improve_listing" | "replenish_stock" | "review_price" | "monitor"
export type Priority = "low" | "medium" | "high" | "critical"

export interface MarketplaceSummary {
  averageGrowth: number
  health: number
  totalRevenue: number
  totalOrders: number
  period: string
}

export interface ProductPerformance {
  productId: string
  sku: string
  productName: string
  category: string
  views: number
  conversions: number
  orders: number
  revenue: number
  conversionRate: number
  marginPercentage: number
}

export interface SalesOpportunity {
  id: string
  sku: string
  productName: string
  category: string
  currentRevenue: number
  currentOrders: number
  conversionRate: number
  views: number
  availableStock: number
  coverageDays: number | null
  priority: Priority
  opportunityType: OpportunityType
  estimatedRevenueGain: number
  estimatedMarginGain: number
  recommendedAction: string
  reason: string
  confidence: number
}

export interface SalesSummary {
  productsAnalyzed: number
  highOpportunities: number
  criticalProducts: number
  estimatedRevenuePotential: number
  estimatedMarginPotential: number
  averageConversion: number
  averageStockCoverage: number | null
}

export interface SalesInput {
  market: MarketplaceSummary
  products: ProductPerformance[]
  inventory: InventoryAnalysis[]
}
