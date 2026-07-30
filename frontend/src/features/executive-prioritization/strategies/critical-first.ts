import type { ExecutiveInsight } from "@/features/executive-intelligence/types"
import { SEVERITY_BONUS } from "@/features/executive-prioritization/constants"

export function strategyCriticalFirst(insights: ExecutiveInsight[]): Map<string, number> {
  const scores = new Map<string, number>()
  const maxBonus = Math.max(...Object.values(SEVERITY_BONUS))
  for (const insight of insights) {
    scores.set(insight.id, (SEVERITY_BONUS[insight.severity] ?? 0) / maxBonus)
  }
  return scores
}
