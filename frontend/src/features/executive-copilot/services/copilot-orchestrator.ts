import type { CopilotInput } from "./executive-copilot-service"
import { DefaultExecutiveCopilotService } from "./executive-copilot-service"
import type { ExecutiveCopilotData } from "@/features/executive-copilot/types"

const defaultSummaries = {
  financial: {
    productsAnalyzed: 0, totalRevenue: 0, estimatedGrossProfit: 0, averageMargin: null,
    idleCapital: 0, workingCapital: 0, highRiskProducts: 0, averageROI: 0, averagePayback: 0,
    financialHealthScore: 0,
  },
  inventory: {
    totalProducts: 0, activeProducts: 0, outOfStockCount: 0, stockoutRiskCount: 0,
    lowStockCount: 0, overstockCount: 0, slowMovingCount: 0, healthyCount: 0,
    totalSuggestedPurchaseUnits: 0, estimatedSuggestedPurchaseCost: 0,
    idleCapitalProductCount: 0, idleCapitalValue: 0, averageCoverageDays: null,
    criticalReplenishmentCount: 0, topReplenishmentProducts: [],
  },
  marketplace: {
    totalRevenue: "R$ 0", totalOrders: 0, formattedTotalOrders: "0",
    averageTicket: "R$ 0", leaderName: "-", highestGrowth: 0,
    highestGrowthName: "-", averageHealth: 0,
  },
  sales: {
    productsAnalyzed: 0, highOpportunities: 0, criticalProducts: 0,
    estimatedRevenuePotential: 0, estimatedMarginPotential: 0,
    averageConversion: 0, averageStockCoverage: null,
  },
  purchase: {
    totalProducts: 0, criticalProducts: 0, recommendedInvestment: 0,
    estimatedProtectedRevenue: 0, estimatedProtectedMargin: 0,
    averageCoverage: null, highestRisk: "low" as const,
  },
}

export function buildCopilotInput(): CopilotInput {
  return {
    financialSummary: { ...defaultSummaries.financial },
    inventorySummary: { ...defaultSummaries.inventory },
    marketplaceSummary: { ...defaultSummaries.marketplace },
    salesSummary: { ...defaultSummaries.sales },
    purchaseSummary: { ...defaultSummaries.purchase },
    executiveInsights: [],
  }
}

export function buildCopilotData(): ExecutiveCopilotData {
  const input = buildCopilotInput()
  const service = new DefaultExecutiveCopilotService()
  return service.compose(input)
}
