import type { ExecutiveInsightBuilder, BuilderContext } from "./executive-insight-builder"
import type { PurchasingInsightInput } from "./inputs/purchasing-insight-input"
import type { ExecutiveInsight } from "@/features/executive-insights/domain"
import { buildInsightKey } from "@/features/executive-insights/domain"
import {
  ExecutiveInsightStatus,
  ExecutiveInsightCategory,
  ExecutiveInsightSeverity,
} from "@/features/executive-insights/types"

function buildId(idx: number): string {
  return `purchasing-insight-${idx}`
}

export class PurchasingExecutiveInsightBuilder
  implements ExecutiveInsightBuilder<PurchasingInsightInput>
{
  readonly module = ExecutiveInsightCategory.PURCHASING

  build(input: PurchasingInsightInput, context: BuilderContext): readonly ExecutiveInsight[] {
    const insights: ExecutiveInsight[] = []

    for (let i = 0; i < input.existingInsights.length; i++) {
      const src = input.existingInsights[i]
      insights.push({
        key: buildInsightKey("purchasing", src.fact),
        id: buildId(i),
        module: "purchasing",
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
          source: "purchasing",
          metric: "health",
          value: input.summary.health,
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
        key: buildInsightKey("purchasing", src.action),
        id: buildId(input.existingInsights.length + i),
        module: "purchasing",
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
          source: "purchasing",
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
