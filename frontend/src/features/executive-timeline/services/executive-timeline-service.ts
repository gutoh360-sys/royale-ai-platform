import type { ExecutiveSnapshot, ExecutiveTimelineEvent, ExecutiveTimelineResult } from "@/features/executive-timeline/types"
import { compareMarketplace, compareInventory, compareExecutive } from "@/features/executive-timeline/comparators"

type ComparatorFn = (prev: ExecutiveSnapshot, curr: ExecutiveSnapshot) => ExecutiveTimelineEvent[]

const COMPARATORS: ComparatorFn[] = [compareMarketplace, compareInventory, compareExecutive]

export interface ExecutiveTimelineService {
  compareSnapshots(previous: ExecutiveSnapshot, current: ExecutiveSnapshot): ExecutiveTimelineResult
}

export class DefaultExecutiveTimelineService implements ExecutiveTimelineService {
  compareSnapshots(previous: ExecutiveSnapshot, current: ExecutiveSnapshot): ExecutiveTimelineResult {
    const all: ExecutiveTimelineEvent[] = []

    for (const comparator of COMPARATORS) {
      all.push(...comparator(previous, current))
    }

    const unique = this.deduplicate(all)
    const sorted = this.sort(unique)
    const top = sorted.slice(0, 10)

    return {
      events: top,
      state: top.length > 0 ? "success" : "empty",
    }
  }

  private deduplicate(events: ExecutiveTimelineEvent[]): ExecutiveTimelineEvent[] {
    const seen = new Map<string, ExecutiveTimelineEvent>()
    for (const event of events) {
      const existing = seen.get(event.id)
      if (!existing || event.priority > existing.priority) {
        seen.set(event.id, event)
      }
    }
    return [...seen.values()]
  }

  private sort(events: ExecutiveTimelineEvent[]): ExecutiveTimelineEvent[] {
    return [...events].sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })
  }
}
