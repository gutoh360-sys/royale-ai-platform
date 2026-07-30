import type { ExecutiveInsight, ExecutiveIntelligenceInput } from "@/features/executive-intelligence/types"
import { CRITICAL_REPLENISHMENT_MINIMUM } from "@/features/executive-intelligence/constants"

export function ruleUrgentReplenishment(input: ExecutiveIntelligenceInput): ExecutiveInsight[] {
  const { inventory } = input

  if (inventory.criticalReplenishmentCount < CRITICAL_REPLENISHMENT_MINIMUM) return []

  const severity = inventory.criticalReplenishmentCount >= 5 ? "critical" : "high"
  const confidence = Math.min(0.7 + inventory.criticalReplenishmentCount * 0.05, 0.98)
  const affectedCount = inventory.criticalReplenishmentCount
  const totalUnits = inventory.totalSuggestedPurchaseUnits
  const priorityBase = Math.round(
    Math.min(affectedCount, 15) * 5 +
    (severity === "critical" ? 25 : 15) +
    Math.round(confidence * 10),
  )

  return [
    {
      id: "urgent-replenishment-needed",
      title: "Produtos críticos aguardando reposição",
      description: `${affectedCount} produto${affectedCount > 1 ? "s" : ""} em estado crítico necessita${affectedCount > 1 ? "m" : ""} de reposição imediata, totalizando ${totalUnits} unidade${totalUnits !== 1 ? "s" : ""}.`,
      category: "inventory",
      severity,
      priority: Math.min(priorityBase, 100),
      affectedDomains: ["inventory", "operations"],
      recommendedAction: "Priorizar a compra dos produtos com reposição crítica para evitar ruptura.",
      estimatedImpact: "Prevenção de ruptura de estoque e perda de vendas.",
      confidence,
      reasons: [
        `${affectedCount} produto${affectedCount > 1 ? "s" : ""} com prioridade crítica de reposição`,
        `${totalUnits} unidade${totalUnits !== 1 ? "s" : ""} sugeridas para compra`,
      ],
      createdAt: new Date().toISOString(),
    },
  ]
}
