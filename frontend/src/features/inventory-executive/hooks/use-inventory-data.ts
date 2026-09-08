"use client";

import { useState, useEffect } from "react";
import type { InventoryDataResult } from "@/features/inventory-executive/types";
import { fetchInventoryData } from "@/services/api-inventory";
import type { Period } from "@/lib/period";

export function useInventoryData(period: Period = "7d"): InventoryDataResult {
  const [result, setResult] = useState<InventoryDataResult>({
    inventory: null,
    status: "loading",
    error: null,
  });

  useEffect(() => {
    fetchInventoryData(period).then(setResult);
  }, [period]);

  return result;
}
