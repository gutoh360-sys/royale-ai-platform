import type { ExecutiveInsight } from "@/features/executive-intelligence/types"

const SEVERITY_BASE: Record<string, number> = {
  critical: 100,
  high: 80,
  medium: 60,
  low: 40,
  info: 20,
}

export function calculatePriority(insight: ExecutiveInsight): number {
  const severityScore = SEVERITY_BASE[insight.severity] ?? 20
  const confidenceScore = Math.round(insight.confidence * 100)
  const impactScore = estimateImpactScore(insight.estimatedImpact)
  const affectedScore = calculateAffectedDomainsScore(insight.affectedDomains.length)

  return Math.round(
    severityScore * 0.35 +
    confidenceScore * 0.25 +
    impactScore * 0.25 +
    affectedScore * 0.15,
  )
}

const IMPACT_SCORE: Record<string, number> = {
  high: 100,
  medium: 60,
  low: 30,
}

function estimateImpactScore(impact: string): number {
  const lower = impact.toLowerCase()
  return IMPACT_SCORE[lower] ?? 40
}

function calculateAffectedDomainsScore(count: number): number {
  if (count >= 3) return 100
  if (count === 2) return 80
  return 50
}
