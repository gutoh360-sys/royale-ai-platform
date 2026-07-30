import type { FinancialData } from "@/features/financial-executive/types";

export const mockFinancial: FinancialData = {
  id: "financial",
  name: "Financeiro",
  revenue: 332500,
  formattedRevenue: "R$ 332,5 mil",
  profit: 49875,
  formattedProfit: "R$ 49,9 mil",
  margin: 15,
  formattedMargin: "15,0%",
  cashFlow: 39900,
  formattedCashFlow: "R$ 39,9 mil",
  workingCapital: 124500,
  formattedWorkingCapital: "R$ 124,5 mil",
  capitalEmployed: 183200,
  formattedCapitalEmployed: "R$ 183,2 mil",
  health: 78,
  growth: 8.3,
  lastUpdate: "2026-07-28T09:00:00",
};
