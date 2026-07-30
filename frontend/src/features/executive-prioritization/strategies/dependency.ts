import type { ExecutiveInsight } from "@/features/executive-intelligence/types"
import { DEPENDENCY_BONUS } from "@/features/executive-prioritization/constants"

export function strategyDependency(insights: ExecutiveInsight[], blockedBy?: Record<string, string[]>): Map<string, number> {
  const scores = new Map<string, number>()
  for (const insight of insights) {
    const blockers = blockedBy?.[insight.id]
    const hasBlockers = blockers && blockers.length > 0
    // Items that block others or are unblocked get a bonus
    // Items that are blocked get 0 bonus (they can't proceed)
    scores.set(insight.id, hasBlockers ? 0 : DEPENDENCY_BONUS)
  }
  return scores
}
