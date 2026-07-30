import type { ExecutiveInsight } from "@/features/executive-insights/domain"
import type { ExecutiveInsightStatus } from "@/features/executive-insights/types"
import type { InsightKey } from "@/features/executive-insights/domain"

export interface ExecutiveInsightRepository {
  save(insight: ExecutiveInsight): Promise<ExecutiveInsight>
  find(id: string): Promise<ExecutiveInsight | null>
  findByKey(key: InsightKey): Promise<ExecutiveInsight | null>
  findByModule(module: string): Promise<ExecutiveInsight[]>
  findActive(): Promise<ExecutiveInsight[]>
  archive(id: string): Promise<void>
  reopen(id: string): Promise<ExecutiveInsight>
  update(id: string, data: Partial<ExecutiveInsight>): Promise<ExecutiveInsight>
  findAll(): Promise<ExecutiveInsight[]>
  findByStatus(status: ExecutiveInsightStatus): Promise<ExecutiveInsight[]>
}
