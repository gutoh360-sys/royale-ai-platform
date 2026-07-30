import type { FinancialData } from "@/features/financial-executive/types"
import type { InsightData } from "@/features/executive-domain/components/executive-insight-card"
import type { RecommendationData } from "@/features/executive-domain/components/executive-recommendation-card"

export interface FinancialInsightInput {
  module: "FINANCIAL"
  financial: FinancialData | null
  existingInsights: InsightData[]
  existingRecommendations: RecommendationData[]
}
