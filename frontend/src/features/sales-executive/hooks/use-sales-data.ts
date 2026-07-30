"use client"

import { useState, useEffect } from "react"
import type { SalesDataResult } from "../types"
import { MockSalesDataService } from "../services/sales-data-service"

export function useSalesData(): SalesDataResult {
  const [result, setResult] = useState<SalesDataResult>({
    sales: null,
    status: "loading",
    error: null,
  })

  useEffect(() => {
    const service = new MockSalesDataService()
    service.fetch().then((res) => {
      setResult(res)
    })
  }, [])

  return result
}
