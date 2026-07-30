import type { ExecutiveInsight, ExecutiveIntelligenceInput } from "@/features/executive-intelligence/types"
import {
  MARKETPLACE_HEALTH_THRESHOLD,
  INVENTORY_LOW_RISK_THRESHOLD,
} from "@/features/executive-intelligence/constants"

export function ruleMarketplaceHealthy(input: ExecutiveIntelligenceInput): ExecutiveInsight[] {
  const { inventory, marketplace } = input

  if (marketplace.averageHealth < MARKETPLACE_HEALTH_THRESHOLD) return []
  const combinedRisk = inventory.outOfStockCount + inventory.stockoutRiskCount
  if (combinedRisk > INVENTORY_LOW_RISK_THRESHOLD) return []

  const confidence = Math.min(0.6 + marketplace.averageHealth / 200, 0.95)
  const priorityBase = Math.round(
    (marketplace.averageHealth / 100) * 30 +
    (1 - combinedRisk / 10) * 20 +
    10,
  )

  return [
    {
      id: "marketplace-healthy-outlook",
      title: "Saúde do marketplace e estoque equilibrados",
      description: `O marketplace apresenta saúde média de ${marketplace.averageHealth}% com baixo risco de ruptura (${combinedRisk} produto${combinedRisk !== 1 ? "s" : ""}).`,
      category: "marketplace",
      severity: "info",
      priority: Math.min(priorityBase, 100),
      affectedDomains: ["marketplace", "inventory"],
      recommendedAction: "Manter as estratégias atuais de reposição e monitoramento.",
      estimatedImpact: "Operação equilibrada com baixo risco de desabastecimento.",
      confidence,
      reasons: [
        `Saúde média do marketplace: ${marketplace.averageHealth}%`,
        `Rupturas e riscos: ${combinedRisk} produto${combinedRisk !== 1 ? "s" : ""}`,
      ],
      createdAt: new Date().toISOString(),
    },
  ]
}
