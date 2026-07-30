"use client"

import { useMemo } from "react"
import { DefaultPurchaseIntelligenceService } from "@/features/purchase-intelligence/services/purchase-intelligence-service"
import { buildMockAnalyses } from "@/features/purchase-intelligence/mocks"

export function usePurchaseIntelligence() {
  return useMemo(() => {
    const { analyses, productData } = buildMockAnalyses()
    const service = new DefaultPurchaseIntelligenceService()
    return service.analyze(analyses, productData)
  }, [])
}
