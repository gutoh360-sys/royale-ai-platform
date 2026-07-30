import type { ExecutiveInsight, ExecutiveIntelligenceInput } from "@/features/executive-intelligence/types"
import {
  ruleMarketplaceGrowthWithStockPressure,
  ruleIdleCapital,
  ruleUrgentReplenishment,
  ruleMarketplaceHealthy,
} from "@/features/executive-intelligence/rules"
import { calculatePriority } from "@/features/executive-intelligence/evaluators"

type RuleFn = (input: ExecutiveIntelligenceInput) => ExecutiveInsight[]

const RULES: RuleFn[] = [
  ruleMarketplaceGrowthWithStockPressure,
  ruleIdleCapital,
  ruleUrgentReplenishment,
  ruleMarketplaceHealthy,
]

function deduplicate(insights: ExecutiveInsight[]): ExecutiveInsight[] {
  const seen = new Map<string, ExecutiveInsight>()

  for (const insight of insights) {
    const key = `${insight.title}|${insight.description}`
    const existing = seen.get(key)
    if (!existing || insight.priority > existing.priority) {
      seen.set(key, insight)
    }
  }

  return [...seen.values()]
}

export interface ExecutiveIntelligenceService {
  generateInsights(input: ExecutiveIntelligenceInput): ExecutiveInsight[]
}

export class DefaultExecutiveIntelligenceService implements ExecutiveIntelligenceService {
  generateInsights(input: ExecutiveIntelligenceInput): ExecutiveInsight[] {
    const all: ExecutiveInsight[] = []

    for (const rule of RULES) {
      const results = rule(input)
      for (const insight of results) {
        all.push({
          ...insight,
          priority: calculatePriority(insight),
        })
      }
    }

    const unique = deduplicate(all)

    return unique.sort((a, b) => b.priority - a.priority)
  }
}
