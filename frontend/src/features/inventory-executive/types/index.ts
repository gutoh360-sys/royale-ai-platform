import type { InventoryIntelligenceSummary } from "@/features/inventory-intelligence/types";

export type InventoryState = "loading" | "success" | "empty" | "error";

export interface InventoryData {
  id: string;
  name: string;
  health: number;
  itemsInStock: number;
  formattedItemsInStock: string;
  itemsWithoutTurnover: number;
  formattedItemsWithoutTurnover: string;
  criticalItems: number;
  formattedCriticalItems: string;
  averageCoverage: number;
  formattedAverageCoverage: string;
  averageTurnover: number;
  formattedAverageTurnover: string;
  immobilizedCapital: number;
  formattedImmobilizedCapital: string;
  stockValue: number;
  formattedStockValue: string;
  totalCapacity: number;
  formattedTotalCapacity: string;
  utilizationRate: number;
  formattedUtilizationRate: string;
  lastUpdate: string;
  summary: InventoryIntelligenceSummary;
}

export interface InventoryDataResult {
  inventory: InventoryData | null;
  status: InventoryState;
  error: string | null;
}
