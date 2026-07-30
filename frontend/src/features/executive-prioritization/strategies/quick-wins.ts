import type { ExecutiveInsight } from "@/features/executive-intelligence/types"
import { COMPLEXITY_PENALTY } from "@/features/executive-prioritization/constants"
import type { Complexity } from "@/features/executive-prioritization/types"

function classifyComplexity(insight: ExecutiveInsight): Complexity {
  const action = insight.recommendedAction.toLowerCase()
  if (/priorizar a compra|comprar|adquirir/i.test(action)) return "easy"
  if (/avaliar|revisar|analisar|validar/i.test(action)) return "medium"
  if (/implementar|criar|desenvolver|configurar/i.test(action)) return "complex"
  return "medium"
}

export function strategyQuickWins(insights: ExecutiveInsight[], complexityOverrides?: Record<string, Complexity>): Map<string, number> {
  const scores = new Map<string, number>()
  const maxPenalty = Math.max(...Object.values(COMPLEXITY_PENALTY))
  for (const insight of insights) {
    const complexity = complexityOverrides?.[insight.id] ?? classifyComplexity(insight)
    const penalty = (COMPLEXITY_PENALTY[complexity] ?? COMPLEXITY_PENALTY.medium) / maxPenalty
    scores.set(insight.id, penalty)
  }
  return scores
}
