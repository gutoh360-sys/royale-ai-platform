import type { InventoryData } from "@/features/inventory-executive/types"
import type { InsightData } from "@/features/executive-domain/components/executive-insight-card"
import type { RecommendationData } from "@/features/executive-domain/components/executive-recommendation-card"

export interface InventoryInsightInput {
  module: "INVENTORY"
  inventory: InventoryData | null
  existingInsights: InsightData[]
  existingRecommendations: RecommendationData[]
}
