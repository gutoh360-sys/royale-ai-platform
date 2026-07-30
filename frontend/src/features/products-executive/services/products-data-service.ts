import type { ProductsDataResult } from "@/features/products-executive/types"
import { mockProducts, mockCategories, mockPortfolioSummary } from "@/features/products-executive/mocks"

export interface ProductsDataService {
  fetch(): Promise<ProductsDataResult>
}

export class MockProductsDataService implements ProductsDataService {
  async fetch(): Promise<ProductsDataResult> {
    return {
      products: mockProducts,
      categories: mockCategories,
      summary: mockPortfolioSummary,
      status: mockProducts.length > 0 ? "success" : "empty",
      error: null,
    }
  }
}
