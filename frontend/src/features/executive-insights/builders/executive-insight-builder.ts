import type { ExecutiveInsight } from "@/features/executive-insights/domain"
import type { ExecutiveInsightCategory } from "@/features/executive-insights/types"

export interface BuilderContext {
  refDate: Date
  sourceRunId: string
}

export interface ExecutiveInsightBuilder<TInput> {
  readonly module: ExecutiveInsightCategory
  build(input: TInput, context: BuilderContext): readonly ExecutiveInsight[]
}
