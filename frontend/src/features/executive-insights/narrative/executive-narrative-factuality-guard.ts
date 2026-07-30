import type { ExecutiveNarrativeInput } from "./executive-narrative-input"
import type { ExecutiveNarrativeOutput } from "./executive-narrative-output"
import type { NarrativeEvidenceReference } from "./executive-narrative-output"

export class ExecutiveNarrativeFactualityGuard {

  validate(
    input: ExecutiveNarrativeInput,
    output: ExecutiveNarrativeOutput,
  ): readonly string[] {
    const violations: string[] = []

    if (output.insightKey !== input.insightKey) {
      violations.push(
        `insightKey mismatch: output "${output.insightKey}" !== input "${input.insightKey}"`,
      )
    }

    if (output.sourceRunId !== input.sourceRunId) {
      violations.push(
        `sourceRunId mismatch: output "${output.sourceRunId}" !== input "${input.sourceRunId}"`,
      )
    }

    for (const ref of output.referencedEvidence) {
      if (!this.evidenceExistsInInput(ref, input)) {
        violations.push(
          `referenced evidence "${ref.field}=${ref.value}" not found in input`,
        )
      }
    }

    if (output.warnings.length > 0 && output.isComplete) {
      violations.push(
        `output has warnings but is marked as complete`,
      )
    }

    return violations
  }

  private evidenceExistsInInput(
    ref: NarrativeEvidenceReference,
    input: ExecutiveNarrativeInput,
  ): boolean {
    const inputRecord: Record<string, string> = {
      title: input.title,
      summary: input.summary,
      fact: input.fact,
      context: input.context,
      impact: input.impact,
      recommendation: input.recommendation,
      module: input.module,
      category: input.category,
      severity: input.severity,
      status: input.status,
      priority: String(input.priority),
      sourceRunId: input.sourceRunId,
      lastEvaluationRun: input.lastEvaluationRun,
      firstDetectedAt: input.firstDetectedAt,
      lastDetectedAt: input.lastDetectedAt,
      occurrenceCount: String(input.occurrenceCount),
    }
    return inputRecord[ref.field] === ref.value
  }
}
