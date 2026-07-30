import type { ExecutiveInsightBuilder, BuilderContext } from "./executive-insight-builder"
import type { SalesInsightInput } from "./inputs/sales-insight-input"
import type { ExecutiveInsight } from "@/features/executive-insights/domain"
import { buildInsightKey } from "@/features/executive-insights/domain"
import {
  ExecutiveInsightStatus,
  ExecutiveInsightCategory,
  ExecutiveInsightSeverity,
  type ExecutiveInsightSeverity as Severity,
} from "@/features/executive-insights/types"
import type { SalesInsight } from "@/features/sales-executive/types"

const SEVERITY_MAP: Record<SalesInsight["type"], Severity> = {
  success: ExecutiveInsightSeverity.POSITIVE,
  warning: ExecutiveInsightSeverity.WARNING,
  danger: ExecutiveInsightSeverity.CRITICAL,
  info: ExecutiveInsightSeverity.INFO,
}

function buildId(idx: number): string {
  return `sales-insight-${idx}`
}

export class SalesExecutiveInsightBuilder
  implements ExecutiveInsightBuilder<SalesInsightInput>
{
  readonly module = ExecutiveInsightCategory.SALES

  build(input: SalesInsightInput, context: BuilderContext): readonly ExecutiveInsight[] {
    const insights: ExecutiveInsight[] = []

    for (let i = 0; i < input.existingInsights.length; i++) {
      const src = input.existingInsights[i]
      insights.push({
        key: buildInsightKey("sales", src.title),
        id: buildId(i),
        module: "sales",
        category: this.module,
        severity: SEVERITY_MAP[src.type],
        status: ExecutiveInsightStatus.NEW,
        priority: 0,
        title: src.title,
        summary: src.description,
        fact: src.description,
        context: "",
        impact: "",
        recommendation: "",
        evidence: {
          source: "sales",
          metric: src.metric,
          classification: src.type,
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
        key: buildInsightKey("sales", src.title),
        id: buildId(input.existingInsights.length + i),
        module: "sales",
        category: this.module,
        severity: ExecutiveInsightSeverity.INFO,
        status: ExecutiveInsightStatus.NEW,
        priority: 0,
        title: src.title,
        summary: src.description,
        fact: src.description,
        context: "",
        impact: src.impact,
        recommendation: src.title,
        evidence: {
          source: "sales",
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
