import type { SalesExecutive } from "./types"
import { buildMockSalesExecutive } from "./mock-data"

export interface SalesExecutiveService {
  getSalesData(): Promise<SalesExecutive>
}

export class DefaultSalesExecutiveService implements SalesExecutiveService {
  async getSalesData(): Promise<SalesExecutive> {
    await new Promise((r) => setTimeout(r, 800))
    return buildMockSalesExecutive()
  }
}
