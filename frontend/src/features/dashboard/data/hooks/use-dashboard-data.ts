"use client";

import { useState, useEffect } from "react";
import type { DashboardDataResult } from "@/features/dashboard/data/types";
import { MockDashboardDataService } from "@/features/dashboard/data/services/dashboard-data-service";

export function useDashboardData(): DashboardDataResult {
  const [result, setResult] = useState<DashboardDataResult>({
    data: { metrics: [], recommendations: [], alerts: [] },
    status: "loading",
    error: null,
  });

  useEffect(() => {
    const service = new MockDashboardDataService();

    service.fetch().then((res) => {
      setResult(res);
    });
  }, []);

  return result;
}
