import type { PurchaseUrgency, PurchaseRiskLevel } from "@/features/purchase-intelligence/types"
import {
  SAFETY_BUFFER_DAYS,
  HIGH_MARGIN_THRESHOLD,
  HIGH_DEMAND_THRESHOLD,
  PRIORITY_MARGIN_WEIGHT,
  PRIORITY_DEMAND_WEIGHT,
  PRIORITY_RISK_WEIGHT,
} from "@/features/purchase-intelligence/constants"

export function evaluateUrgency(
  coverageDays: number | null,
  leadTimeDays: number,
  suggestedQuantity: number,
  cost: number,
): PurchaseUrgency {
  if (coverageDays === null || coverageDays <= leadTimeDays) return "immediate"
  if (coverageDays <= leadTimeDays + SAFETY_BUFFER_DAYS) return "today"
  if (coverageDays <= leadTimeDays * 2) return "this_week"
  if (suggestedQuantity <= 0 || cost <= 0) return "planned"
  return "planned"
}

export function evaluateRiskLevel(
  coverageDays: number | null,
  leadTimeDays: number,
  status: string,
): PurchaseRiskLevel {
  if (status === "out_of_stock") return "critical"
  if (coverageDays === null || coverageDays <= leadTimeDays) return "critical"
  if (coverageDays <= leadTimeDays + SAFETY_BUFFER_DAYS) return "high"
  if (status === "stockout_risk") return "high"
  if (status === "low_stock") return "medium"
  return "low"
}

export function evaluatePriority(
  grossMarginPercentage: number | null,
  averageDailySales: number,
  riskLevel: PurchaseRiskLevel,
): number {
  const marginScore = grossMarginPercentage !== null && grossMarginPercentage >= HIGH_MARGIN_THRESHOLD ? 1 : 0.3
  const demandScore = averageDailySales >= HIGH_DEMAND_THRESHOLD ? 1 : averageDailySales > 0 ? 0.5 : 0.1
  const riskScore = riskLevel === "critical" ? 1 : riskLevel === "high" ? 0.7 : riskLevel === "medium" ? 0.4 : 0.1

  return Math.round(
    (marginScore * PRIORITY_MARGIN_WEIGHT + demandScore * PRIORITY_DEMAND_WEIGHT + riskScore * PRIORITY_RISK_WEIGHT) * 100,
  )
}
