"use client"

import { useState, useEffect } from "react"
import type { ProductsDataResult } from "@/features/products-executive/types"
import { MockProductsDataService } from "@/features/products-executive/services/products-data-service"

export function useProductsData(): ProductsDataResult {
  const [result, setResult] = useState<ProductsDataResult>({
    products: [],
    categories: [],
    summary: {
      totalProducts: 0,
      activeProducts: 0,
      formattedActiveProducts: "0",
      categories: 0,
      topSku: "-",
      topSkuName: "-",
      topSkuRevenue: "R$ 0",
      averageRevenuePerProduct: "R$ 0",
      averageMargin: "0%",
      averageMarginValue: 0,
      top10Concentration: "0%",
      top10ConcentrationValue: 0,
      totalRevenue: "R$ 0",
      totalRevenueValue: 0,
      health: 0,
      growth: 0,
    },
    status: "loading",
    error: null,
  })

  useEffect(() => {
    const service = new MockProductsDataService()
    service.fetch().then((res) => {
      setResult(res)
    })
  }, [])

  return result
}
