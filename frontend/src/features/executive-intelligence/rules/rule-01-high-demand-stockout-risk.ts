import type { ExecutiveInsight, ExecutiveIntelligenceInput } from "@/features/executive-intelligence/types"
import { MARKETPLACE_GROWTH_THRESHOLD } from "@/features/executive-intelligence/constants"

export function ruleMarketplaceGrowthWithStockPressure(input: ExecutiveIntelligenceInput): ExecutiveInsight[] {
  const { inventory, marketplace } = input

  if (marketplace.highestGrowth < MARKETPLACE_GROWTH_THRESHOLD) return []
  if (inventory.criticalReplenishmentCount === 0) return []

  const affectedCount = inventory.criticalReplenishmentCount
  const confidence = Math.min(0.5 + marketplace.highestGrowth / 200, 0.95)
  const priorityBase = Math.round(
    (marketplace.highestGrowth / 100) * 40 +
    Math.min(affectedCount, 10) * 6,
  )

  return [
    {
      id: "marketplace-growth-stock-pressure",
      title: "Crescimento de vendas com pressão sobre o estoque",
      description: `O marketplace apresenta crescimento de ${marketplace.highestGrowth}% enquanto existem ${affectedCount} produto${affectedCount > 1 ? "s" : ""} com reposição crítica.`,
      category: "inventory",
      severity: "high",
      priority: Math.min(priorityBase, 100),
      affectedDomains: ["inventory", "marketplace"],
      recommendedAction: "Priorizar a análise dos produtos críticos para verificar quais podem limitar o crescimento das vendas.",
      estimatedImpact: "medium",
      confidence,
      reasons: [
        `Crescimento consolidado do marketplace acima do limite: ${marketplace.highestGrowth}%`,
        `Produtos classificados com reposição crítica: ${affectedCount}`,
      ],
      createdAt: new Date().toISOString(),
    },
  ]
}
