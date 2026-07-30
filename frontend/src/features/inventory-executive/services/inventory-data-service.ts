import type { InventoryDataResult } from "@/features/inventory-executive/types";
import { mockInventory } from "@/features/inventory-executive/mocks";

export interface InventoryDataService {
  fetch(): Promise<InventoryDataResult>;
}

export class MockInventoryDataService implements InventoryDataService {
  async fetch(): Promise<InventoryDataResult> {
    return {
      inventory: mockInventory,
      status: "success",
      error: null,
    };
  }
}
