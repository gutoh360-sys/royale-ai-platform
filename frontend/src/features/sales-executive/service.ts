import type { SalesExecutive } from "./types"
import { fetchSalesExecutiveData } from "@/services/api-orders"

export interface SalesExecutiveService {
  getSalesData(): Promise<SalesExecutive>
}

export class DefaultSalesExecutiveService implements SalesExecutiveService {
  async getSalesData(): Promise<SalesExecutive> {
    return fetchSalesExecutiveData()
  }
}
