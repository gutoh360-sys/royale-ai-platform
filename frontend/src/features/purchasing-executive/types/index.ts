export interface ReplenishmentCategory {
  name: string
  productsToBuy: number
  totalUnits: number
  estimatedInvestment: number
  formattedInvestment: string
  averageCoverage: number
  priority: "alta" | "media" | "baixa"
}

export interface SupplierData {
  name: string
  share: number
  formattedShare: string
  leadTimeDays: number
  activeOrders: number
  reliability: number
}

export interface PurchasingSummary {
  productsToReplenish: number
  totalUnitsToBuy: number
  capitalInPurchases: string
  capitalInPurchasesValue: number
  averageCoverage: string
  averageCoverageDays: number
  pendingOrders: number
  suppliers: number
  averageLeadTime: string
  averageLeadTimeDays: number
  health: number
  generalPriority: string
  highestRisk: string
}

export type PurchasingState = "loading" | "success" | "empty" | "error"

export interface PurchasingDataResult {
  categories: ReplenishmentCategory[]
  suppliers: SupplierData[]
  summary: PurchasingSummary
  status: PurchasingState
  error: string | null
}
