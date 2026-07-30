import type { ExecutiveInsight, ExecutiveIntelligenceInput } from "@/features/executive-intelligence/types"
import {
  IDLE_CAPITAL_PRODUCT_MINIMUM,
  IDLE_CAPITAL_VALUE_MINIMUM,
} from "@/features/executive-intelligence/constants"

export function ruleIdleCapital(input: ExecutiveIntelligenceInput): ExecutiveInsight[] {
  const { inventory } = input

  if (inventory.idleCapitalProductCount < IDLE_CAPITAL_PRODUCT_MINIMUM) return []
  if (inventory.idleCapitalValue < IDLE_CAPITAL_VALUE_MINIMUM) return []

  const severity = inventory.idleCapitalValue >= 100_000 ? "high" : inventory.idleCapitalValue >= 30_000 ? "medium" : "low"
  const confidence = Math.min(0.6 + Math.min(inventory.idleCapitalProductCount, 20) * 0.015, 0.95)
  const priorityBase = Math.round(
    Math.min(inventory.idleCapitalProductCount, 20) * 3 +
    Math.min(inventory.idleCapitalValue, 500_000) / 5000 +
    (severity === "high" ? 20 : severity === "medium" ? 10 : 0),
  )

  return [
    {
      id: "idle-capital-elevated",
      title: "Capital imobilizado em produtos de baixo giro",
      description: `R$ ${inventory.idleCapitalValue.toLocaleString("pt-BR")} em ${inventory.idleCapitalProductCount} produto${inventory.idleCapitalProductCount > 1 ? "s" : ""} com excesso de estoque ou sem giro.`,
      category: "inventory",
      severity,
      priority: Math.min(priorityBase, 100),
      affectedDomains: ["inventory", "financial"],
      recommendedAction: "Avaliar promoções, liquidações ou devoluções para liberar capital parado.",
      estimatedImpact: severity === "high" ? "high" : severity === "medium" ? "medium" : "low",
      confidence,
      reasons: [
        `Alerta acionado por limite monetário absoluto: R$ ${inventory.idleCapitalValue.toLocaleString("pt-BR")}`,
        `${inventory.idleCapitalProductCount} produto${inventory.idleCapitalProductCount > 1 ? "s" : ""} classificados como excedente ou sem giro`,
      ],
      createdAt: new Date().toISOString(),
    },
  ]
}
