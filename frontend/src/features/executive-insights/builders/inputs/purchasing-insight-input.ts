import type { ReplenishmentCategory, SupplierData, PurchasingSummary } from "@/features/purchasing-executive/types"
import type { InsightData } from "@/features/executive-domain/components/executive-insight-card"
import type { RecommendationData } from "@/features/executive-domain/components/executive-recommendation-card"

export interface PurchasingInsightInput {
  module: "PURCHASING"
  categories: ReplenishmentCategory[]
  suppliers: SupplierData[]
  summary: PurchasingSummary
  existingInsights: InsightData[]
  existingRecommendations: RecommendationData[]
}
