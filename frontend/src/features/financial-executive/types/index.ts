export type FinancialState = "loading" | "success" | "empty" | "error";

export interface FinancialData {
  id: string;
  name: string;
  revenue: number;
  formattedRevenue: string;
  profit: number;
  formattedProfit: string;
  margin: number;
  formattedMargin: string;
  cashFlow: number;
  formattedCashFlow: string;
  workingCapital: number;
  formattedWorkingCapital: string;
  capitalEmployed: number;
  formattedCapitalEmployed: string;
  health: number;
  growth: number;
  lastUpdate: string;
}

export interface FinancialDataResult {
  financial: FinancialData | null;
  status: FinancialState;
  error: string | null;
}
