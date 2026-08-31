"use client";

import { useState, useEffect } from "react";
import type { CommandCenterResult } from "@/features/dashboard/executive-command-center/types";
import { fetchCommandCenterData } from "@/services/api-command-center";

export function useExecutiveCommandCenter(): CommandCenterResult {
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
    fetchCommandCenterData().then(setResult);
  }, []);

  return result;
}
