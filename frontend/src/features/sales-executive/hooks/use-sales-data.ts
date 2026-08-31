"use client"

import { useState, useEffect } from "react"
import type { SalesDataResult } from "../types"
import { fetchSalesData } from "@/services/api-orders"
import type { AnalyticsPeriodDays } from "@/types/api"

export function useSalesData(days: AnalyticsPeriodDays = 7): SalesDataResult {
  const [result, setResult] = useState<SalesDataResult>({
    sales: null,
    status: "loading",
    error: null,
  })

  useEffect(() => {
    fetchSalesData(days).then(setResult)
  }, [days])

  return result
}
