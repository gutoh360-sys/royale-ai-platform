"use client"

import { useMemo } from "react"
import { useMarketplaceData } from "@/features/marketplace/hooks/use-marketplace-data"
import { useFinancialData } from "@/features/financial-executive/hooks/use-financial-data"
import { useInventoryData } from "@/features/inventory-executive/hooks/use-inventory-data"
import { useSalesData } from "@/features/sales-executive/hooks/use-sales-data"
import { useProductsData } from "@/features/products-executive/hooks/use-products-data"
import { usePurchasingData } from "@/features/purchasing-executive/hooks/use-purchasing-data"
import { useBriefing } from "@/features/executive-briefing/hooks/use-briefing"
import type { ModuleSnapshots, OrchestratorState } from "@/features/executive-copilot/types/briefing"

export function useExecutiveOrchestrator(): {
  snapshots: ModuleSnapshots | null
  state: OrchestratorState
} {
  const mp = useMarketplaceData()
  const fn = useFinancialData()
  const inv = useInventoryData()
  const sales = useSalesData()
  const pr = useProductsData()
  const pu = usePurchasingData()
  const briefing = useBriefing()

  return useMemo(() => {
    const allLoaded =
      mp.status !== "loading" &&
      fn.status !== "loading" &&
      inv.status !== "loading" &&
      sales.status !== "loading" &&
      pr.status !== "loading" &&
      pu.status !== "loading"

    if (!allLoaded) {
      return { snapshots: null, state: "loading" }
    }

    const hasAnyError =
      mp.status === "error" ||
      fn.status === "error" ||
      inv.status === "error" ||
      sales.status === "error" ||
      pr.status === "error" ||
      pu.status === "error"

    if (hasAnyError) {
      return { snapshots: null, state: "error" }
    }

    const hasAnyData =
      mp.status === "success" ||
      fn.status === "success" ||
      inv.status === "success" ||
      sales.status === "success" ||
      pr.status === "success" ||
      pu.status === "success"

    if (!hasAnyData) {
      return { snapshots: null, state: "empty" }
    }

    return {
      snapshots: {
        marketplace: { summary: mp.summary, marketplaces: mp.marketplaces, status: mp.status },
        financial: { financial: fn.financial, status: fn.status },
        inventory: { inventory: inv.inventory, status: inv.status },
        sales: { sales: sales.sales, status: sales.status },
        products: { summary: pr.summary, status: pr.status },
        purchasing: { summary: pu.summary, status: pu.status },
        priorities: briefing.priorities,
      },
      state: "success",
    }
  }, [mp, fn, inv, sales, pr, pu, briefing])
}
