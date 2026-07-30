import type { OpportunityType, Priority } from "@/features/sales-intelligence/types"
import {
  HIGH_CONVERSION_THRESHOLD, LOW_CONVERSION_THRESHOLD, HIGH_VIEWS_THRESHOLD,
  LOW_STOCK_THRESHOLD_DAYS, HIGH_STOCK_THRESHOLD_DAYS, HIGH_MARGIN_THRESHOLD,
} from "@/features/sales-intelligence/constants"

export function evaluateOpportunityType(
  conversionRate: number,
  views: number,
  coverageDays: number | null,
  marginPercentage: number | null,
  availableStock: number,
): OpportunityType {
  const hasHighConversion = conversionRate >= HIGH_CONVERSION_THRESHOLD
  const hasLowConversion = conversionRate <= LOW_CONVERSION_THRESHOLD
  const hasManyViews = views >= HIGH_VIEWS_THRESHOLD
  const hasLowStock = coverageDays !== null && coverageDays <= LOW_STOCK_THRESHOLD_DAYS
  const hasHighStock = coverageDays !== null && coverageDays >= HIGH_STOCK_THRESHOLD_DAYS
  const hasHighMargin = marginPercentage !== null && marginPercentage >= HIGH_MARGIN_THRESHOLD
  const hasStock = availableStock > 0

  if (hasHighConversion && hasLowStock) return "replenish_stock"
  if (hasManyViews && hasLowConversion) return "improve_listing"
  if (hasHighMargin && hasHighConversion && hasStock) return "increase_ads"
  if (hasHighStock && !hasHighConversion) return "review_price"
  return "monitor"
}

export function evaluatePriority(
  opportunityScore: number,
): Priority {
  if (opportunityScore >= 75) return "critical"
  if (opportunityScore >= 50) return "high"
  if (opportunityScore >= 25) return "medium"
  return "low"
}

export function evaluateConfidence(
  conversionRate: number,
  views: number,
  stockAvailability: number,
): number {
  let score = 0.5
  if (views > 1000) score += 0.2
  if (views > 5000) score += 0.1
  if (conversionRate > 0.03) score += 0.1
  if (stockAvailability > 0.5) score += 0.1
  return Math.min(score, 1)
}
