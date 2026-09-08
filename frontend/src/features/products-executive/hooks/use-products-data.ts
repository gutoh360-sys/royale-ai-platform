"use client"

import { useState, useEffect } from "react"
import type { ProductsDataResult } from "@/features/products-executive/types"
import { fetchProductsData } from "@/services/api-products"

export function useProductsData(): ProductsDataResult & { retry: () => void } {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<ProductsDataResult>({
    products: [],
    stockDistribution: [],
    brandDistribution: [],
    categoryDistribution: [],
    statusDistribution: [],
    summary: {
      totalProducts: 0,
      activeProducts: 0,
      formattedActiveProducts: "0",
      outOfStockProducts: 0,
      totalStock: 0,
      averageRegisteredPrice: "N/D",
      productsWithPrice: 0,
      brands: 0,
      categories: 0,
      topSku: "N/D",
      topSkuName: "N/D",
      topSkuRevenue: "N/D",
      averageRevenuePerProduct: "N/D",
      averageMargin: "N/D",
      top10Concentration: "N/D",
      totalRevenue: "N/D",
      growth: "N/D",
    },
    salesAnalytics: null,
    status: "loading",
    error: null,
  })

  useEffect(() => {
    let active = true
    setResult((previous) => ({ ...previous, status: "loading" }))
    fetchProductsData().then((data) => { if (active) setResult(data) })
    return () => { active = false }
  }, [attempt])
  useEffect(() => {
    const refresh = () => setAttempt((n) => n + 1)
    window.addEventListener("products-synced", refresh)
    window.addEventListener("storage", refresh)
    return () => {
      window.removeEventListener("products-synced", refresh)
      window.removeEventListener("storage", refresh)
    }
  }, [])

  return { ...result, retry: () => setAttempt((n) => n + 1) }
}
