"use client"

import { useMemo } from "react"
import { DefaultFinancialIntelligenceService } from "@/features/financial-intelligence/services/financial-intelligence-service"
import { buildFinancialInput } from "@/features/financial-intelligence/mocks"

export function useFinancialIntelligence() {
  return useMemo(() => {
    const input = buildFinancialInput()
    const service = new DefaultFinancialIntelligenceService()
    return service.analyze(input)
  }, [])
}
