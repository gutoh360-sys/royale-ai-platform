import { describe, it, expect } from "vitest"
import { compareMarketplace } from "@/features/executive-timeline/comparators/marketplace-comparator"
import { compareInventory } from "@/features/executive-timeline/comparators/inventory-comparator"
import { compareExecutive } from "@/features/executive-timeline/comparators/executive-comparator"
import { DefaultExecutiveTimelineService } from "@/features/executive-timeline/services/executive-timeline-service"
import {
  snapshotPrevious,
  snapshotCurrent,
  snapshotIdentical,
} from "@/features/executive-timeline/mocks"
import type { ExecutiveSnapshot } from "@/features/executive-timeline/types"
import type { ExecutiveInsight, ExecutiveSeverity } from "@/features/executive-intelligence/types"

function insight(id: string, severity: ExecutiveSeverity): ExecutiveInsight {
  return { id, title: "", description: "", category: "inventory", severity, priority: 0, affectedDomains: [], recommendedAction: "", estimatedImpact: "", confidence: 0, reasons: [], createdAt: "" }
}

function makeSnapshot(overrides?: Partial<ExecutiveSnapshot>): ExecutiveSnapshot {
  return {
    ...snapshotIdentical,
    ...overrides,
    marketplaceSummary: { ...snapshotIdentical.marketplaceSummary, ...overrides?.marketplaceSummary },
    inventorySummary: { ...snapshotIdentical.inventorySummary, ...overrides?.inventorySummary },
    executiveSummary: overrides?.executiveSummary ?? [],
  }
}

describe("Marketplace Comparator", () => {
  it("detects improvement when health increases", () => {
    const prev = makeSnapshot({ marketplaceSummary: { ...snapshotIdentical.marketplaceSummary, averageHealth: 70 } })
    const curr = makeSnapshot({ marketplaceSummary: { ...snapshotIdentical.marketplaceSummary, averageHealth: 85 } })
    const result = compareMarketplace(prev, curr)
    const health = result.find((e) => e.id === "tl-marketplace-health")
    expect(health).toBeDefined()
    expect(health!.direction).toBe("improved")
  })

  it("detects worsening when growth decreases", () => {
    const prev = makeSnapshot({ marketplaceSummary: { ...snapshotIdentical.marketplaceSummary, highestGrowth: 25 } })
    const curr = makeSnapshot({ marketplaceSummary: { ...snapshotIdentical.marketplaceSummary, highestGrowth: 10 } })
    const result = compareMarketplace(prev, curr)
    const growth = result.find((e) => e.id === "tl-marketplace-growth")
    expect(growth).toBeDefined()
    expect(growth!.direction).toBe("worsened")
  })

  it("returns empty when marketplace is unchanged", () => {
    const result = compareMarketplace(snapshotIdentical, snapshotIdentical)
    expect(result.length).toBe(0)
  })
})

describe("Inventory Comparator", () => {
  it("detects improvement when stockout decreases", () => {
    const prev = makeSnapshot({ inventorySummary: { ...snapshotIdentical.inventorySummary, outOfStockCount: 8 } })
    const curr = makeSnapshot({ inventorySummary: { ...snapshotIdentical.inventorySummary, outOfStockCount: 3 } })
    const result = compareInventory(prev, curr)
    const stockout = result.find((e) => e.id === "tl-inventory-stockout")
    expect(stockout).toBeDefined()
    expect(stockout!.direction).toBe("improved")
  })

  it("detects worsening when idle capital increases", () => {
    const prev = makeSnapshot({ inventorySummary: { ...snapshotIdentical.inventorySummary, idleCapitalValue: 10000, idleCapitalProductCount: 3 } })
    const curr = makeSnapshot({ inventorySummary: { ...snapshotIdentical.inventorySummary, idleCapitalValue: 50000, idleCapitalProductCount: 10 } })
    const result = compareInventory(prev, curr)
    const idle = result.find((e) => e.id === "tl-inventory-idle-capital")
    expect(idle).toBeDefined()
    expect(idle!.direction).toBe("worsened")
  })

  it("detects improvement when critical replenishment decreases", () => {
    const prev = makeSnapshot({ inventorySummary: { ...snapshotIdentical.inventorySummary, criticalReplenishmentCount: 6 } })
    const curr = makeSnapshot({ inventorySummary: { ...snapshotIdentical.inventorySummary, criticalReplenishmentCount: 2 } })
    const result = compareInventory(prev, curr)
    const critical = result.find((e) => e.id === "tl-inventory-critical")
    expect(critical).toBeDefined()
    expect(critical!.direction).toBe("improved")
  })

  it("returns empty when inventory is unchanged", () => {
    const result = compareInventory(snapshotIdentical, snapshotIdentical)
    expect(result.length).toBe(0)
  })
})

describe("Executive Comparator", () => {
  it("detects worsening when insight count increases", () => {
    const prev = makeSnapshot({ executiveSummary: [] })
    const curr = makeSnapshot({ executiveSummary: [insight("i1", "critical"), insight("i2", "high")] })
    const result = compareExecutive(prev, curr)
    const total = result.find((e) => e.id === "tl-executive-insights")
    expect(total).toBeDefined()
    expect(total!.direction).toBe("worsened")
  })

  it("detects improvement when critical count decreases", () => {
    const prev = makeSnapshot({ executiveSummary: [insight("i1", "critical"), insight("i2", "critical")] })
    const curr = makeSnapshot({ executiveSummary: [insight("i1", "high")] })
    const result = compareExecutive(prev, curr)
    const critical = result.find((e) => e.id === "tl-executive-critical")
    expect(critical).toBeDefined()
    expect(critical!.direction).toBe("improved")
  })
})

describe("Deduplication and Ordering", () => {
  it("deduplicates by id keeping highest priority", () => {
    const service = new DefaultExecutiveTimelineService()
    const result = service.compareSnapshots(snapshotPrevious, snapshotCurrent)
    const ids = result.events.map((e) => e.id)
    expect([...new Set(ids)].length).toBe(ids.length)
  })

  it("orders by priority descending then timestamp descending", () => {
    const service = new DefaultExecutiveTimelineService()
    const result = service.compareSnapshots(snapshotPrevious, snapshotCurrent)
    for (let i = 1; i < result.events.length; i++) {
      if (result.events[i - 1].priority === result.events[i].priority) {
        expect(new Date(result.events[i - 1].timestamp).getTime())
          .toBeGreaterThanOrEqual(new Date(result.events[i].timestamp).getTime())
      } else {
        expect(result.events[i - 1].priority).toBeGreaterThan(result.events[i].priority)
      }
    }
  })

  it("limits to 10 events", () => {
    const service = new DefaultExecutiveTimelineService()
    const result = service.compareSnapshots(snapshotPrevious, snapshotCurrent)
    expect(result.events.length).toBeLessThanOrEqual(10)
  })
})

describe("No Changes Scenario", () => {
  it("returns empty state when snapshots are identical", () => {
    const service = new DefaultExecutiveTimelineService()
    const result = service.compareSnapshots(snapshotIdentical, snapshotIdentical)
    expect(result.state).toBe("empty")
    expect(result.events.length).toBe(0)
  })
})

describe("Complete Timeline", () => {
  it("generates events with valid snapshot pair", () => {
    const service = new DefaultExecutiveTimelineService()
    const result = service.compareSnapshots(snapshotPrevious, snapshotCurrent)
    expect(result.state).toBe("success")
    expect(result.events.length).toBeGreaterThanOrEqual(3)
  })

  it("all events have required fields", () => {
    const service = new DefaultExecutiveTimelineService()
    const result = service.compareSnapshots(snapshotPrevious, snapshotCurrent)
    for (const event of result.events) {
      expect(event.id).toBeTruthy()
      expect(event.title).toBeTruthy()
      expect(event.description).toBeTruthy()
      expect(["marketplace", "inventory", "executive"]).toContain(event.category)
      expect(["improved", "worsened", "unchanged"]).toContain(event.direction)
      expect(typeof event.priority).toBe("number")
      expect(event.priority).toBeGreaterThanOrEqual(0)
      expect(event.priority).toBeLessThanOrEqual(100)
      expect(event.timestamp).toBeTruthy()
    }
  })
})
