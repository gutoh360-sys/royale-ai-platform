import type { MarketplaceSummaryData, MarketplaceData, MarketplaceState } from "@/features/marketplace/types"
import type { FinancialData, FinancialState } from "@/features/financial-executive/types"
import type { InventoryData, InventoryState } from "@/features/inventory-executive/types"
import type { SalesData, SalesState } from "@/features/sales-executive/types"
import type { PortfolioSummary, ProductsState } from "@/features/products-executive/types"
import type { PurchasingSummary, PurchasingState } from "@/features/purchasing-executive/types"
import type { ExecutivePriority } from "@/features/executive-prioritization/types"

export interface ModuleSnapshots {
  marketplace: { summary: MarketplaceSummaryData; marketplaces: MarketplaceData[]; status: MarketplaceState }
  financial: { financial: FinancialData | null; status: FinancialState }
  inventory: { inventory: InventoryData | null; status: InventoryState }
  sales: { sales: SalesData | null; status: SalesState }
  products: { summary: PortfolioSummary; status: ProductsState }
  purchasing: { summary: PurchasingSummary; status: PurchasingState }
  priorities: ExecutivePriority[]
}

export type OrchestratorState = "loading" | "success" | "empty" | "error"
