import type { ExecutiveInsight } from "@/features/executive-insights/domain"

export interface ExecutiveInsightProvider {
  provide(): Promise<ExecutiveInsight[]>
}
