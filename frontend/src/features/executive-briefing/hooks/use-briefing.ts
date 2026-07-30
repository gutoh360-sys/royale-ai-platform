"use client"

import { useMemo } from "react"
import { DefaultInventoryIntelligenceService } from "@/features/inventory-intelligence/services/inventory-intelligence-service"
import { mockStockProducts } from "@/features/inventory-intelligence/mocks"
import { mockMarketplaces, buildMockSummary } from "@/features/marketplace/mocks"
import { DefaultExecutiveIntelligenceService } from "@/features/executive-intelligence/services/executive-intelligence-service"
import { DefaultExecutivePrioritizationService } from "@/features/executive-prioritization/services/executive-prioritization-service"
import {
  MOCK_COMPLEXITY,
  MOCK_BLOCKED_BY,
  MOCK_RELATED,
} from "@/features/executive-prioritization/mocks"
import type { BriefingData } from "@/features/executive-briefing/types"

const refDate = new Date("2026-07-27")

export function useBriefing(): BriefingData {
  return useMemo(() => {
    const inventoryService = new DefaultInventoryIntelligenceService()
    const analyses = inventoryService.analyzeProducts(mockStockProducts, refDate)
    const inventory = inventoryService.buildSummary(analyses)
    const marketplace = buildMockSummary(mockMarketplaces)

    const engine = new DefaultExecutiveIntelligenceService()
    const insights = engine.generateInsights({ inventory, marketplace })

    const prioritizer = new DefaultExecutivePrioritizationService()
    const priorities = prioritizer.prioritize(insights, {
      complexityOverrides: MOCK_COMPLEXITY,
      blockedBy: MOCK_BLOCKED_BY,
      relatedInsights: MOCK_RELATED,
    })

    return {
      priorities,
      state: priorities.length > 0 ? "success" : "empty",
    }
  }, [])
}
