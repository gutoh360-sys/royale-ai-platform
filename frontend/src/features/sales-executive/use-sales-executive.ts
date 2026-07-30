"use client"

import { useState, useEffect } from "react"
import type { SalesExecutive } from "./types"
import { DefaultSalesExecutiveService } from "./service"

export function useSalesExecutive(service = new DefaultSalesExecutiveService()) {
  const [data, setData] = useState<SalesExecutive | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    service
      .getSalesData()
      .then((result) => {
        if (!cancelled) {
          setData(result)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Falha ao carregar dados de vendas.")
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [service])

  return { data, loading, error }
}
