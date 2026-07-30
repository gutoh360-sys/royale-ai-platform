"use client";

import { useState, useEffect } from "react";
import type { FinancialDataResult } from "@/features/financial-executive/types";
import { MockFinancialDataService } from "@/features/financial-executive/services/financial-data-service";

export function useFinancialData(): FinancialDataResult {
  const [result, setResult] = useState<FinancialDataResult>({
    financial: null,
    status: "loading",
    error: null,
  });

  useEffect(() => {
    const service = new MockFinancialDataService();
    service.fetch().then((res) => {
      setResult(res);
    });
  }, []);

  return result;
}
