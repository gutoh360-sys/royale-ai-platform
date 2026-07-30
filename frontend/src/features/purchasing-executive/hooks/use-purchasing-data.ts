"use client"

import { useState, useEffect } from "react"
import type { PurchasingDataResult } from "@/features/purchasing-executive/types"
import { MockPurchasingDataService } from "@/features/purchasing-executive/services/purchasing-data-service"

export function usePurchasingData(): PurchasingDataResult {
  const [result, setResult] = useState<PurchasingDataResult>({
    categories: [],
    suppliers: [],
    summary: {
      productsToReplenish: 0,
      totalUnitsToBuy: 0,
      capitalInPurchases: "R$ 0",
      capitalInPurchasesValue: 0,
      averageCoverage: "0 dias",
      averageCoverageDays: 0,
      pendingOrders: 0,
      suppliers: 0,
      averageLeadTime: "0 dias",
      averageLeadTimeDays: 0,
      health: 0,
      generalPriority: "-",
      highestRisk: "-",
    },
    status: "loading",
    error: null,
  })

  useEffect(() => {
    const service = new MockPurchasingDataService()
    service.fetch().then((res) => {
      setResult(res)
    })
  }, [])

  return result
}
