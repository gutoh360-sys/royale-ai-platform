import { IDLE_CAPITAL_DAYS } from "@/features/financial-intelligence/constants"

export function calculateROI(revenue: number, cost: number): number {
  if (cost <= 0) return revenue > 0 ? 999 : 0
  return Math.round(((revenue - cost) / cost) * 100)
}

export function calculatePayback(investment: number, monthlyProfit: number): number {
  if (monthlyProfit <= 0) return 999
  return Math.round(investment / monthlyProfit)
}

export function calculateGrossMargin(revenue: number, cost: number): number {
  if (revenue <= 0) return 0
  return revenue - cost
}

export function calculateIdleCapital(availableStock: number, cost: number, coverageDays: number | null): number {
  if (availableStock <= 0 || cost <= 0) return 0
  if (coverageDays === null) return 0
  const excessDays = Math.max(0, coverageDays - IDLE_CAPITAL_DAYS)
  const excessRatio = excessDays / coverageDays
  return Math.round(availableStock * cost * excessRatio)
}

export function calculateWorkingCapitalImpact(
  inventoryValue: number,
  idleCapital: number,
  totalRevenue: number,
): number {
  if (totalRevenue <= 0) return 0
  const activeCapital = inventoryValue - idleCapital
  const turnoverRatio = activeCapital > 0 ? totalRevenue / activeCapital : 0
  return Math.round(idleCapital * (1 - Math.min(turnoverRatio / 12, 1)))
}

export function calculateFinancialHealthScore(
  averageMargin: number | null,
  averageROI: number,
  averagePayback: number,
  highRiskRatio: number,
  idleCapitalRatio: number,
): number {
  const marginScore = averageMargin !== null ? Math.min(averageMargin / 0.5, 1) * 30 : 15
  const roiScore = Math.min(averageROI / 100, 1) * 25
  const paybackScore = Math.max(0, 1 - averagePayback / 360) * 20
  const riskScore = (1 - highRiskRatio) * 15
  const idleScore = (1 - idleCapitalRatio) * 10
  return Math.round(Math.min(marginScore + roiScore + paybackScore + riskScore + idleScore, 100))
}

export function calculateInvestmentEfficiency(roi: number, paybackDays: number): number {
  if (paybackDays <= 0) return roi > 0 ? 100 : 0
  const efficiency = roi / Math.max(paybackDays / 30, 1)
  return Math.round(Math.min(efficiency, 100))
}
