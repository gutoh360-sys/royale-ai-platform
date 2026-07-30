import type { ExecutiveInsightBuilder, BuilderContext } from "./executive-insight-builder"
import type { MarketplaceInsightInput } from "./inputs/marketplace-insight-input"
import type { ExecutiveInsight } from "@/features/executive-insights/domain"
import { buildInsightKey } from "@/features/executive-insights/domain"
import {
  ExecutiveInsightStatus,
  ExecutiveInsightCategory,
  ExecutiveInsightSeverity,
} from "@/features/executive-insights/types"

function buildId(input: MarketplaceInsightInput, idx: number): string {
  return `marketplace-insight-${input.summary.leaderName.replace(/\s+/g, "-").toLowerCase()}-${idx}`
}

export class MarketplaceExecutiveInsightBuilder
  implements ExecutiveInsightBuilder<MarketplaceInsightInput>
{
  readonly module = ExecutiveInsightCategory.MARKETPLACE

  build(input: MarketplaceInsightInput, context: BuilderContext): readonly ExecutiveInsight[] {
    const insights: ExecutiveInsight[] = []

    for (let i = 0; i < input.existingInsights.length; i++) {
      const src = input.existingInsights[i]
      insights.push({
        key: buildInsightKey("marketplace", src.fact),
        id: buildId(input, i),
        module: "marketplace",
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
          source: "marketplace",
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
        key: buildInsightKey("marketplace", src.action),
        id: buildId(input, input.existingInsights.length + i),
        module: "marketplace",
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
          source: "marketplace",
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
