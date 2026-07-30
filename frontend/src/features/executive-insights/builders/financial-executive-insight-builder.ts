import type { ExecutiveInsightBuilder, BuilderContext } from "./executive-insight-builder"
import type { FinancialInsightInput } from "./inputs/financial-insight-input"
import type { ExecutiveInsight } from "@/features/executive-insights/domain"
import { buildInsightKey } from "@/features/executive-insights/domain"
import {
  ExecutiveInsightStatus,
  ExecutiveInsightCategory,
  ExecutiveInsightSeverity,
} from "@/features/executive-insights/types"

function buildId(idx: number): string {
  return `financial-insight-${idx}`
}

export class FinancialExecutiveInsightBuilder
  implements ExecutiveInsightBuilder<FinancialInsightInput>
{
  readonly module = ExecutiveInsightCategory.FINANCIAL

  build(input: FinancialInsightInput, context: BuilderContext): readonly ExecutiveInsight[] {
    const insights: ExecutiveInsight[] = []

    for (let i = 0; i < input.existingInsights.length; i++) {
      const src = input.existingInsights[i]
      insights.push({
        key: buildInsightKey("financial", src.fact),
        id: buildId(i),
        module: "financial",
        category: this.module,
        severity: ExecutiveInsightSeverity.INFO,
        status: ExecutiveInsightStatus.NEW,
        priority: 0,
        title: src.fact,
        summary: src.reason,
        fact: src.fact,
        context: "",
        impact: src.impact,
        recommendation: src.action,
        evidence: {
          source: "financial",
          metric: input.financial ? "health" : undefined,
          value: input.financial?.health ?? undefined,
          classification: "existing_insight",
          generatedAt: context.refDate.toISOString(),
        },
        relatedInsights: [],
        metadata: {},
        version: 1,
        firstDetectedAt: context.refDate,
        lastDetectedAt: context.refDate,
        occurrenceCount: 1,
        lastEvaluationRun: context.sourceRunId,
        createdAt: context.refDate,
        updatedAt: context.refDate,
        resolvedAt: null,
        archivedAt: null,
      })
    }

    for (let i = 0; i < input.existingRecommendations.length; i++) {
      const src = input.existingRecommendations[i]
      insights.push({
        key: buildInsightKey("financial", src.action),
        id: buildId(input.existingInsights.length + i),
        module: "financial",
        category: this.module,
        severity: ExecutiveInsightSeverity.INFO,
        status: ExecutiveInsightStatus.NEW,
        priority: 0,
        title: src.action,
        summary: src.reason,
        fact: src.action,
        context: "",
        impact: "",
        recommendation: src.action,
        evidence: {
          source: "financial",
          classification: "existing_recommendation",
          generatedAt: context.refDate.toISOString(),
        },
        relatedInsights: [],
        metadata: {},
        version: 1,
        firstDetectedAt: context.refDate,
        lastDetectedAt: context.refDate,
        occurrenceCount: 1,
        lastEvaluationRun: context.sourceRunId,
        createdAt: context.refDate,
        updatedAt: context.refDate,
        resolvedAt: null,
        archivedAt: null,
      })
    }

    return insights
  }
}
