"use client";

import { useState, useEffect } from "react";
import type { CommandCenterResult } from "@/features/dashboard/executive-command-center/types";
import { fetchCommandCenterData } from "@/services/api-command-center";
import type { AnalyticsPeriodDays } from "@/types/api";

export function useExecutiveCommandCenter(days: AnalyticsPeriodDays = 7): CommandCenterResult {
  const [result, setResult] = useState<CommandCenterResult>({
    data: {
      status: { healthScore: 0, label: "", summary: "" },
      attention: [],
      opportunities: [],
      recommendations: [],
    },
    status: "loading",
    error: null,
  });

  useEffect(() => {
    fetchCommandCenterData(days).then(setResult);
  }, [days]);

  return result;
}
