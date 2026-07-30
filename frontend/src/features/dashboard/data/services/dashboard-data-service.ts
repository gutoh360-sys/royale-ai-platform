import type { DashboardDataResult } from "@/features/dashboard/data/types";
import { mockExecutiveMetrics, mockRecommendations, mockAlerts } from "@/features/dashboard/data/mocks";

export interface DashboardDataService {
  fetch(): Promise<DashboardDataResult>;
}

export class MockDashboardDataService implements DashboardDataService {
  async fetch(): Promise<DashboardDataResult> {
    const metrics = mockExecutiveMetrics;
    const recommendations = mockRecommendations;
    const alerts = mockAlerts;

    return {
      data: { metrics, recommendations, alerts },
      status: metrics.length > 0 ? "success" : "empty",
      error: null,
    };
  }
}
