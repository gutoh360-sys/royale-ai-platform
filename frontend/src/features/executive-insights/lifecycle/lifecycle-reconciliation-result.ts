import type { ExecutiveInsight } from "@/features/executive-insights/domain"

export interface LifecycleReconciliationResult {
  readonly created: readonly ExecutiveInsight[]
  readonly activated: readonly ExecutiveInsight[]
  readonly updated: readonly ExecutiveInsight[]
  readonly resolved: readonly ExecutiveInsight[]
  readonly unchanged: readonly ExecutiveInsight[]
  readonly ignored: readonly ExecutiveInsight[]
}
