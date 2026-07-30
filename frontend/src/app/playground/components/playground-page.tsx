"use client";

import { useState } from "react";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { ExecutiveSummary } from "@/features/dashboard/executive-summary/components/executive-summary";
import { AIRecommendations } from "@/features/dashboard/ai-recommendations/components/ai-recommendations";
import { OperationsAlertCenter } from "@/features/dashboard/alerts-center/components/operations-alert-center";
import { useDashboardData } from "@/features/dashboard/data/hooks/use-dashboard-data";
import { DevControls } from "./dev-controls";
import type { DashboardDataStatus } from "@/features/dashboard/data/types";

export function PlaygroundPage() {
  const { data } = useDashboardData();
  const [mode, setMode] = useState<DashboardDataStatus>("success");

  const commonState = (mode === "idle" ? "loading" : mode) as "loading" | "success" | "empty" | "error";

  return (
    <div>
      <DevControls mode={mode} onChange={setMode} />
      <div className="p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <DashboardHeader />
          <ExecutiveSummary
            metrics={data.metrics}
            state={commonState}
          />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <AIRecommendations
              recommendations={data.recommendations}
              state={commonState}
            />
            <OperationsAlertCenter
              alerts={data.alerts}
              state={commonState}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
