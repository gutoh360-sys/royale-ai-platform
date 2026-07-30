import type { ExecutiveInsight } from "@/features/executive-intelligence/types"
import type { ExecutivePriority, Urgency, Complexity } from "@/features/executive-prioritization/types"
import {
  PRIORITY_WEIGHT,
  SEVERITY_WEIGHT,
  IMPACT_WEIGHT,
  COMPLEXITY_WEIGHT,
  DEPENDENCY_WEIGHT,
  URGENCY_THRESHOLD,
  WHY_NOW_TEMPLATES,
} from "@/features/executive-prioritization/constants"
import { strategyCriticalFirst, strategyHighImpact, strategyQuickWins, strategyDependency } from "@/features/executive-prioritization/strategies"

function classifyUrgency(priorityScore: number): Urgency {
  if (priorityScore >= URGENCY_THRESHOLD.immediate) return "immediate"
  if (priorityScore >= URGENCY_THRESHOLD.today) return "today"
  if (priorityScore >= URGENCY_THRESHOLD.this_week) return "this_week"
  return "monitor"
}

function determineWhyNow(severity: string, urgency: Urgency): string {
  if (urgency === "immediate") return WHY_NOW_TEMPLATES.immediate
  if (urgency === "today") return WHY_NOW_TEMPLATES.today
  if (severity === "critical" || severity === "high") return WHY_NOW_TEMPLATES.today
  if (urgency === "this_week") return WHY_NOW_TEMPLATES.this_week
  return WHY_NOW_TEMPLATES.monitor
}

export interface ExecutivePrioritizationService {
  prioritize(insights: ExecutiveInsight[], options?: {
    complexityOverrides?: Record<string, Complexity>
    blockedBy?: Record<string, string[]>
    relatedInsights?: Record<string, string[]>
  }): ExecutivePriority[]
}

export class DefaultExecutivePrioritizationService implements ExecutivePrioritizationService {
  prioritize(
    insights: ExecutiveInsight[],
    options?: {
      complexityOverrides?: Record<string, Complexity>
      blockedBy?: Record<string, string[]>
      relatedInsights?: Record<string, string[]>
    },
  ): ExecutivePriority[] {
    const criticalScores = strategyCriticalFirst(insights)
    const impactScores = strategyHighImpact(insights)
    const winScores = strategyQuickWins(insights, options?.complexityOverrides)
    const depScores = strategyDependency(insights, options?.blockedBy)

    const maxPriority = Math.max(...insights.map((i) => i.priority), 1)

    const scored = insights.map((insight) => {
      const priorityNorm = insight.priority / maxPriority
      const severityScore = criticalScores.get(insight.id) ?? 0
      const impactScore = impactScores.get(insight.id) ?? 0
      const complexityScore = winScores.get(insight.id) ?? 0
      const depScore = depScores.get(insight.id) ?? 0

      const combinedScore = Math.round(
        priorityNorm * PRIORITY_WEIGHT * 100 +
        severityScore * SEVERITY_WEIGHT * 100 +
        impactScore * IMPACT_WEIGHT * 100 +
        (1 - complexityScore) * COMPLEXITY_WEIGHT * 100 +
        depScore * DEPENDENCY_WEIGHT,
      )

      const urgency = classifyUrgency(combinedScore)
      const whyNow = determineWhyNow(insight.severity, urgency)

      return { combinedScore, urgency, whyNow, insight }
    })

    scored.sort((a, b) => {
      if (b.combinedScore !== a.combinedScore) return b.combinedScore - a.combinedScore
      return b.insight.priority - a.insight.priority
    })

    return scored.map((item, index) => ({
      id: item.insight.id,
      rank: index + 1,
      title: item.insight.title,
      description: item.insight.description,
      recommendedAction: item.insight.recommendedAction,
      whyNow: item.whyNow,
      priorityScore: item.combinedScore,
      urgency: item.urgency,
      estimatedImpact: item.insight.estimatedImpact,
      blockedBy: options?.blockedBy?.[item.insight.id] ?? [],
      relatedInsights: options?.relatedInsights?.[item.insight.id] ?? [],
      severity: item.insight.severity,
      reasons: item.insight.reasons,
      category: item.insight.category,
    }))
  }
}
