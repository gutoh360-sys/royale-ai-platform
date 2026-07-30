import type { ReplenishmentCategory, SupplierData, PurchasingSummary } from "@/features/purchasing-executive/types"

export const mockReplenishmentCategories: ReplenishmentCategory[] = [
  {
    name: "Eletrônicos",
    productsToBuy: 4,
    totalUnits: 85,
    estimatedInvestment: 18900,
    formattedInvestment: "R$ 18,9 mil",
    averageCoverage: 8,
    priority: "alta",
  },
  {
    name: "Casa",
    productsToBuy: 2,
    totalUnits: 45,
    estimatedInvestment: 3200,
    formattedInvestment: "R$ 3,2 mil",
    averageCoverage: 14,
    priority: "media",
  },
  {
    name: "Móveis",
    productsToBuy: 1,
    totalUnits: 15,
    estimatedInvestment: 4800,
    formattedInvestment: "R$ 4,8 mil",
    averageCoverage: 22,
    priority: "baixa",
  },
  {
    name: "Moda",
    productsToBuy: 1,
    totalUnits: 30,
    estimatedInvestment: 1260,
    formattedInvestment: "R$ 1,3 mil",
    averageCoverage: 11,
    priority: "media",
  },
]

export const mockSuppliers: SupplierData[] = [
  { name: "Distribuidora Tech Ltda", share: 38, formattedShare: "38%", leadTimeDays: 7, activeOrders: 5, reliability: 94 },
  { name: "Importadora Asia Direct", share: 22, formattedShare: "22%", leadTimeDays: 18, activeOrders: 3, reliability: 82 },
  { name: "Log Brasil Supply", share: 18, formattedShare: "18%", leadTimeDays: 5, activeOrders: 4, reliability: 97 },
  { name: "National Parts SA", share: 14, formattedShare: "14%", leadTimeDays: 10, activeOrders: 2, reliability: 88 },
  { name: "Fresh Commerce", share: 8, formattedShare: "8%", leadTimeDays: 6, activeOrders: 1, reliability: 91 },
]

function buildPurchasingSummary(): PurchasingSummary {
  const totalProducts = mockReplenishmentCategories.reduce((s, c) => s + c.productsToBuy, 0)
  const totalUnits = mockReplenishmentCategories.reduce((s, c) => s + c.totalUnits, 0)
  const totalCapital = mockReplenishmentCategories.reduce((s, c) => s + c.estimatedInvestment, 0)
  const avgCoverage = Math.round(mockReplenishmentCategories.reduce((s, c) => s + c.averageCoverage, 0) / mockReplenishmentCategories.length)
  const avgLeadTime = Math.round(mockSuppliers.reduce((s, sup) => s + sup.leadTimeDays, 0) / mockSuppliers.length)
  const totalOrders = mockSuppliers.reduce((s, sup) => s + sup.activeOrders, 0)

  const criticalProducts = mockReplenishmentCategories.filter((c) => c.priority === "alta").reduce((s, c) => s + c.productsToBuy, 0)
  const healthScore = Math.round(
    (totalProducts - criticalProducts) / totalProducts * 30 +
    (avgCoverage >= 10 ? 25 : avgCoverage >= 5 ? 15 : 5) +
    (avgLeadTime <= 10 ? 25 : avgLeadTime <= 15 ? 15 : 5) +
    10,
  )

  const riskLevels = ["crítico", "alto", "moderado", "baixo"]
  const riskIndex = avgCoverage >= 15 ? 3 : avgCoverage >= 8 ? 2 : avgCoverage >= 5 ? 1 : 0

  return {
    productsToReplenish: totalProducts,
    totalUnitsToBuy: totalUnits,
    capitalInPurchases: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact" }).format(totalCapital),
    capitalInPurchasesValue: totalCapital,
    averageCoverage: `${avgCoverage} dias`,
    averageCoverageDays: avgCoverage,
    pendingOrders: totalOrders,
    suppliers: mockSuppliers.length,
    averageLeadTime: `${avgLeadTime} dias`,
    averageLeadTimeDays: avgLeadTime,
    health: Math.min(healthScore, 100),
    generalPriority: criticalProducts > 2 ? "Alta" : criticalProducts > 0 ? "Média" : "Baixa",
    highestRisk: riskLevels[riskIndex],
  }
}

export const mockPurchasingSummary = buildPurchasingSummary()

export const mockEmptyReplenishment: ReplenishmentCategory[] = []
