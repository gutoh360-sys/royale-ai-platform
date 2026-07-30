import type { PurchasingDataResult } from "@/features/purchasing-executive/types"
import { mockReplenishmentCategories, mockSuppliers, mockPurchasingSummary } from "@/features/purchasing-executive/mocks"

export interface PurchasingDataService {
  fetch(): Promise<PurchasingDataResult>
}

export class MockPurchasingDataService implements PurchasingDataService {
  async fetch(): Promise<PurchasingDataResult> {
    return {
      categories: mockReplenishmentCategories,
      suppliers: mockSuppliers,
      summary: mockPurchasingSummary,
      status: mockReplenishmentCategories.length > 0 ? "success" : "empty",
      error: null,
    }
  }
}
