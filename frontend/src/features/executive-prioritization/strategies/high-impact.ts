import type { ExecutiveInsight } from "@/features/executive-intelligence/types"
import { IMPACT_BONUS } from "@/features/executive-prioritization/constants"

export function strategyHighImpact(insights: ExecutiveInsight[]): Map<string, number> {
  const scores = new Map<string, number>()
  const maxBonus = Math.max(...Object.values(IMPACT_BONUS))
  for (const insight of insights) {
    scores.set(insight.id, (IMPACT_BONUS[insight.estimatedImpact] ?? IMPACT_BONUS.low) / maxBonus)
  }
  return scores
}
