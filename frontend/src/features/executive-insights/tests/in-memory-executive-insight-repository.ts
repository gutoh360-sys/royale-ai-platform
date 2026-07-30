import type { ExecutiveInsightRepository } from "@/features/executive-insights/repository"
import type { ExecutiveInsight } from "@/features/executive-insights/domain"
import type { InsightKey } from "@/features/executive-insights/domain"
import type { ExecutiveInsightStatus } from "@/features/executive-insights/types"

export class InMemoryExecutiveInsightRepository
  implements ExecutiveInsightRepository
{
  private readonly store = new Map<string, ExecutiveInsight>()

  async save(insight: ExecutiveInsight): Promise<ExecutiveInsight> {
    this.store.set(insight.key, { ...insight })
    return { ...insight }
  }

  async find(id: string): Promise<ExecutiveInsight | null> {
    for (const entry of this.store.values()) {
      if (entry.id === id) return { ...entry }
    }
    return null
  }

  async findByKey(key: InsightKey): Promise<ExecutiveInsight | null> {
    const entry = this.store.get(key)
    return entry ? { ...entry } : null
  }

  async findByModule(module: string): Promise<ExecutiveInsight[]> {
    return Array.from(this.store.values())
      .filter((e) => e.module === module)
      .map((e) => ({ ...e }))
  }

  async findActive(): Promise<ExecutiveInsight[]> {
    return Array.from(this.store.values())
      .filter((e) => e.status === "ACTIVE")
      .map((e) => ({ ...e }))
  }

  async archive(id: string): Promise<void> {
    for (const [key, entry] of this.store) {
      if (entry.id === id) {
        this.store.set(key, { ...entry, status: "ARCHIVED" as ExecutiveInsightStatus })
        return
      }
    }
  }

  async reopen(id: string): Promise<ExecutiveInsight> {
    for (const [key, entry] of this.store) {
      if (entry.id === id) {
        const updated: ExecutiveInsight = {
          ...entry,
          status: "ACTIVE" as ExecutiveInsightStatus,
          resolvedAt: null,
        }
        this.store.set(key, updated)
        return { ...updated }
      }
    }
    throw new Error(`Insight with id ${id} not found`)
  }

  async update(id: string, data: Partial<ExecutiveInsight>): Promise<ExecutiveInsight> {
    for (const [key, entry] of this.store) {
      if (entry.id === id) {
        const updated: ExecutiveInsight = { ...entry, ...data }
        this.store.set(key, updated)
        return { ...updated }
      }
    }
    throw new Error(`Insight with id ${id} not found`)
  }

  async findAll(): Promise<ExecutiveInsight[]> {
    return Array.from(this.store.values()).map((e) => ({ ...e }))
  }

  async findByStatus(status: ExecutiveInsightStatus): Promise<ExecutiveInsight[]> {
    return Array.from(this.store.values())
      .filter((e) => e.status === status)
      .map((e) => ({ ...e }))
  }

  clear(): void {
    this.store.clear()
  }

  count(): number {
    return this.store.size
  }
}
