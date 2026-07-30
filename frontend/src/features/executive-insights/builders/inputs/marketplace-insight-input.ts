import type { MarketplaceData, MarketplaceSummaryData } from "@/features/marketplace/types"
import type { InsightData } from "@/features/executive-domain/components/executive-insight-card"
import type { RecommendationData } from "@/features/executive-domain/components/executive-recommendation-card"

export interface MarketplaceInsightInput {
  module: "MARKETPLACE"
  marketplaces: MarketplaceData[]
  summary: MarketplaceSummaryData
  existingInsights: InsightData[]
  existingRecommendations: RecommendationData[]
}
