export function calculateConversionScore(conversionRate: number, views: number): number {
  if (views <= 0) return 0
  const base = Math.min(conversionRate / 0.1, 1)
  const viewFactor = Math.min(views / 1000, 1)
  return Math.round((base * 0.6 + viewFactor * 0.4) * 100) / 100
}

export function calculateRevenuePotential(
  currentRevenue: number,
  conversionRate: number,
  averageGrowth: number,
): number {
  if (currentRevenue <= 0) return 0
  const growthFactor = Math.max(averageGrowth, 0) / 100
  const conversionFactor = Math.max(1 - conversionRate / 0.1, 0)
  return Math.round(currentRevenue * (growthFactor + conversionFactor * 0.3))
}

export function calculateMarginPotential(
  marginPercentage: number,
  estimatedRevenue: number,
): number {
  if (estimatedRevenue <= 0 || marginPercentage <= 0) return 0
  return Math.round(estimatedRevenue * (marginPercentage / 100))
}

export function calculateStockAvailability(
  availableStock: number,
  coverageDays: number | null,
): number {
  if (availableStock <= 0) return 0
  if (coverageDays === null) return 0.5
  if (coverageDays >= 60) return 1
  if (coverageDays >= 30) return 0.8
  if (coverageDays >= 15) return 0.6
  if (coverageDays >= 7) return 0.3
  return 0.1
}

export function calculateSalesOpportunityScore(
  conversionScore: number,
  marginPercentage: number | null,
  stockAvailability: number,
  views: number,
  revenue: number,
): number {
  const marginScore = marginPercentage !== null ? Math.min(marginPercentage / 100, 1) : 0.3
  const viewScore = Math.min(views / 2000, 1)
  const revenueScore = Math.min(revenue / 50000, 1)
  const raw =
    conversionScore * 0.3 +
    marginScore * 0.25 +
    stockAvailability * 0.2 +
    viewScore * 0.15 +
    revenueScore * 0.1
  return Math.round(raw * 100)
}

export function calculatePriorityScore(opportunityScore: number, confidence: number): number {
  return Math.round(opportunityScore * confidence)
}
