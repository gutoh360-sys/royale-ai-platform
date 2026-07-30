import type { FinancialRisk, Recommendation } from "@/features/financial-intelligence/types"
import { HIGH_MARGIN_THRESHOLD, LOW_MARGIN_THRESHOLD, HIGH_ROI_THRESHOLD } from "@/features/financial-intelligence/constants"

export function evaluateFinancialRisk(
  grossMarginPercentage: number | null,
  roi: number,
  idleCapital: number,
  inventoryValue: number,
  coverageDays: number | null,
): FinancialRisk {
  const margin = grossMarginPercentage !== null ? grossMarginPercentage / 100 : 0
  const idleRatio = inventoryValue > 0 ? idleCapital / inventoryValue : 0
  const hasLowMargin = margin < 0.15
  const hasNegativeROI = roi <= 0
  const highIdle = idleRatio > 0.5
  const extremeCoverage = coverageDays !== null && coverageDays > 180

  if (hasNegativeROI && (hasLowMargin || highIdle)) return "critical"
  if (hasLowMargin || hasNegativeROI || highIdle) return "high"
  if (extremeCoverage || idleRatio > 0.3) return "medium"
  return "low"
}

export function evaluateRecommendation(
  grossMarginPercentage: number | null,
  roi: number,
  idleCapital: number,
  inventoryValue: number,
  coverageDays: number | null,
): Recommendation {
  const margin = grossMarginPercentage !== null ? grossMarginPercentage / 100 : 0
  const idleRatio = inventoryValue > 0 ? idleCapital / inventoryValue : 0

  if (margin >= HIGH_MARGIN_THRESHOLD && roi >= HIGH_ROI_THRESHOLD) return "increase_investment"
  if (idleRatio > 0.4 || (coverageDays !== null && coverageDays > 120)) return "reduce_inventory"
  if (margin < LOW_MARGIN_THRESHOLD) return "improve_margin"
  return "monitor"
}

export function evaluateConfidence(roi: number, revenue: number, marginPercentage: number | null): number {
  let score = 0.5
  if (revenue > 10000) score += 0.15
  if (revenue > 50000) score += 0.1
  if (marginPercentage !== null && marginPercentage > 30) score += 0.15
  if (roi > 30) score += 0.1
  return Math.min(score, 1)
}
