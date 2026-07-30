import type { InsightKey } from "@/features/executive-insights/domain"

export interface NarrativeEvidenceReference {
  readonly field: string
  readonly value: string
}

export interface ExecutiveNarrativeOutput {
  readonly insightKey: InsightKey
  readonly summary: string
  readonly details: string
  readonly sourceRunId: string
  readonly generatedAt: string
  readonly referencedEvidence: readonly NarrativeEvidenceReference[]
  readonly warnings: readonly string[]
  readonly isComplete: boolean
}
