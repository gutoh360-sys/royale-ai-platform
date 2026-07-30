import type { FinancialDataResult } from "@/features/financial-executive/types";
import { mockFinancial } from "@/features/financial-executive/mocks";

export interface FinancialDataService {
  fetch(): Promise<FinancialDataResult>;
}

export class MockFinancialDataService implements FinancialDataService {
  async fetch(): Promise<FinancialDataResult> {
    return {
      financial: mockFinancial,
      status: "success",
      error: null,
    };
  }
}
