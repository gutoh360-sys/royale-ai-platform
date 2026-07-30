"use client"

import { useMemo } from "react"
import { DefaultSalesIntelligenceService } from "@/features/sales-intelligence/services/sales-intelligence-service"
import { buildSalesInput } from "@/features/sales-intelligence/mocks"

export function useSalesIntelligence() {
  return useMemo(() => {
    const input = buildSalesInput()
    const service = new DefaultSalesIntelligenceService()
    return service.analyze(input)
  }, [])
}
