import type { ProductPerformance, CategoryData, PortfolioSummary } from "@/features/products-executive/types"
import type { InsightData } from "@/features/executive-domain/components/executive-insight-card"
import type { RecommendationData } from "@/features/executive-domain/components/executive-recommendation-card"

export interface ProductsInsightInput {
  module: "PRODUCTS"
  products: ProductPerformance[]
  categories: CategoryData[]
  summary: PortfolioSummary
  existingInsights: InsightData[]
  existingRecommendations: RecommendationData[]
}
