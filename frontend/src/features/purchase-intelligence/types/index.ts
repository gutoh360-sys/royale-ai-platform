export interface ProductPurchaseData {
  averageDailySales: number
  leadTimeDays: number
  salePrice: number
  cost: number
}

export type PurchaseUrgency = "immediate" | "today" | "this_week" | "planned"

export type PurchaseRiskLevel = "low" | "medium" | "high" | "critical"

export interface PurchaseRecommendation {
  id: string
  sku: string
  productName: string
  recommendedQuantity: number
  currentStock: number
  projectedStock: number
  coverageDays: number | null
  leadTimeDays: number
  estimatedInvestment: number
  estimatedRevenueProtection: number
  estimatedMarginProtection: number
  urgency: PurchaseUrgency
  priority: number
  riskLevel: PurchaseRiskLevel
  recommendedOrderDate: string
  latestSafeOrderDate: string
  reason: string
}

export interface PurchaseSummary {
  totalProducts: number
  criticalProducts: number
  recommendedInvestment: number
  estimatedProtectedRevenue: number
  estimatedProtectedMargin: number
  averageCoverage: number | null
  highestRisk: PurchaseRiskLevel
}
