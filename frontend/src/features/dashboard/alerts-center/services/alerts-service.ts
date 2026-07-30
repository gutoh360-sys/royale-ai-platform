import type { AlertData } from "@/features/dashboard/alerts-center/types";

export interface AlertsService {
  fetch(): Promise<AlertData[]>;
}
