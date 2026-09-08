"use client"

import { useState, useEffect } from "react"
import type { SalesDataResult } from "../types"
import { fetchSalesData } from "@/services/api-orders"
import type { Period } from "@/lib/period"

export function useSalesData(period: Period = "7d"): SalesDataResult {
  const [result, setResult] = useState<SalesDataResult>({
    sales: null,
    status: "loading",
    error: null,
  })

  useEffect(() => {
    fetchSalesData(period).then(setResult)
  }, [period])

  return result
}
