"use client";

import { useState, useEffect } from "react";
import type { CommandCenterResult } from "@/features/dashboard/executive-command-center/types";
import { fetchCommandCenterData } from "@/services/api-command-center";
import type { Period } from "@/lib/period";

export function useExecutiveCommandCenter(period: Period = "30d"): CommandCenterResult {
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
    fetchCommandCenterData(period).then(setResult);
  }, [period]);

  return result;
}
