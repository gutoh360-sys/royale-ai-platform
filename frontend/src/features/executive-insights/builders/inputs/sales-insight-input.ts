import type { SalesData, SalesInsight, SalesRecommendation } from "@/features/sales-executive/types"

export interface SalesInsightInput {
  module: "SALES"
  sales: SalesData | null
  existingInsights: SalesInsight[]
  existingRecommendations: SalesRecommendation[]
}
