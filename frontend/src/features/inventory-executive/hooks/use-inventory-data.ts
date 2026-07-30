"use client";

import { useState, useEffect } from "react";
import type { InventoryDataResult } from "@/features/inventory-executive/types";
import { MockInventoryDataService } from "@/features/inventory-executive/services/inventory-data-service";

export function useInventoryData(): InventoryDataResult {
  const [result, setResult] = useState<InventoryDataResult>({
    inventory: null,
    status: "loading",
    error: null,
  });

  useEffect(() => {
    const service = new MockInventoryDataService();
    service.fetch().then((res) => {
      setResult(res);
    });
  }, []);

  return result;
}
