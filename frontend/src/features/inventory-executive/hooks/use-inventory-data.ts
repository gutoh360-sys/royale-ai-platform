"use client";

import { useState, useEffect } from "react";
import type { InventoryDataResult } from "@/features/inventory-executive/types";
import { fetchInventoryData } from "@/services/api-inventory";

export function useInventoryData(): InventoryDataResult {
  const [result, setResult] = useState<InventoryDataResult>({
    inventory: null,
    status: "loading",
    error: null,
  });

  useEffect(() => {
    fetchInventoryData().then(setResult);
  }, []);

  return result;
}
