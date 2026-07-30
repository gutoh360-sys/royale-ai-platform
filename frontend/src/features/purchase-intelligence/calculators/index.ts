export function calculateCoverageRisk(coverageDays: number | null, leadTimeDays: number): number {
  if (coverageDays === null) return 1
  if (coverageDays <= 0) return 1
  if (coverageDays <= leadTimeDays) return 0.8
  if (coverageDays <= leadTimeDays * 1.5) return 0.5
  return 0.2
}

export function calculateLeadTimeRisk(leadTimeDays: number): number {
  if (leadTimeDays >= 20) return 0.9
  if (leadTimeDays >= 10) return 0.6
  if (leadTimeDays >= 5) return 0.3
  return 0.1
}

export function calculateInvestment(quantity: number, cost: number): number {
  return Math.round(quantity * Math.max(0, cost))
}

export function calculateRevenueProtection(quantity: number, salePrice: number, averageDailySales: number): number {
  if (averageDailySales <= 0) return 0
  const estimatedLostSales = Math.min(quantity, Math.round(averageDailySales * 30))
  return Math.round(estimatedLostSales * salePrice)
}

export function calculateMarginProtection(quantity: number, salePrice: number, cost: number, averageDailySales: number): number {
  if (averageDailySales <= 0) return 0
  const margin = salePrice - cost
  if (margin <= 0) return 0
  const estimatedLostSales = Math.min(quantity, Math.round(averageDailySales * 30))
  return Math.round(estimatedLostSales * margin)
}

export function calculateSafeOrderDate(leadTimeDays: number, stockoutInDays: number | null): string {
  const now = new Date()
  if (stockoutInDays === null || stockoutInDays <= 0) return now.toISOString()
  const latest = new Date(now.getTime() + stockoutInDays * 24 * 60 * 60 * 1000)
  return latest.toISOString()
}

export function calculateRecommendedOrderDate(leadTimeDays: number, stockoutInDays: number | null): string {
  const now = new Date()
  if (stockoutInDays === null || stockoutInDays <= leadTimeDays) return now.toISOString()
  const recommended = new Date(now.getTime() + (stockoutInDays - leadTimeDays) * 24 * 60 * 60 * 1000)
  return recommended.toISOString()
}
