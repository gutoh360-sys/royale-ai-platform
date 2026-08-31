"use client"

import { useState, useEffect } from "react"
import type { SalesDataResult } from "../types"
import { fetchSalesData } from "@/services/api-orders"

export function useSalesData(): SalesDataResult {
  const [result, setResult] = useState<SalesDataResult>({
    sales: null,
    status: "loading",
    error: null,
  })

  useEffect(() => {
    fetchSalesData().then(setResult)
  }, [])

  return result
}
