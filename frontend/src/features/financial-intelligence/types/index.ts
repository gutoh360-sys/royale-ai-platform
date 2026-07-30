import type { InventoryAnalysis } from "@/features/inventory-intelligence/types"
import type { SalesOpportunity } from "@/features/sales-intelligence/types"
import type { PurchaseSummary } from "@/features/purchase-intelligence/types"
import type { MarketplaceSummary } from "@/features/sales-intelligence/types"

export type FinancialRisk = "low" | "medium" | "high" | "critical"
export type Recommendation = "increase_investment" | "reduce_inventory" | "improve_margin" | "monitor"

export interface FinancialInsight {
  id: string
  productId: string
  sku: string
  productName: string
  category: string
  currentRevenue: number
  estimatedProfit: number
  grossMargin: number
  grossMarginPercentage: number | null
  inventoryValue: number
  idleCapital: number
  financialRisk: FinancialRisk
  roi: number
  paybackDays: number
  workingCapitalImpact: number
  priority: number
  recommendation: Recommendation
  reason: string
  confidence: number
}

export interface FinancialSummary {
  productsAnalyzed: number
  totalRevenue: number
  estimatedGrossProfit: number
  averageMargin: number | null
  idleCapital: number
  workingCapital: number
  highRiskProducts: number
  averageROI: number
  averagePayback: number
  financialHealthScore: number
}

export interface FinancialInput {
  inventory: InventoryAnalysis[]
  salesOpportunities: SalesOpportunity[]
  purchaseSummary: PurchaseSummary
  marketplace: MarketplaceSummary
}
