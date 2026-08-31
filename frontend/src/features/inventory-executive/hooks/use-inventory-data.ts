"use client";

import { useState, useEffect } from "react";
import type { InventoryDataResult } from "@/features/inventory-executive/types";
import { fetchInventoryData } from "@/services/api-inventory";
import type { AnalyticsPeriodDays } from "@/types/api";

export function useInventoryData(days: AnalyticsPeriodDays = 7): InventoryDataResult {
  const [result, setResult] = useState<InventoryDataResult>({
    inventory: null,
    status: "loading",
    error: null,
  });

  useEffect(() => {
    fetchInventoryData(days).then(setResult);
  }, [days]);

  return result;
}
