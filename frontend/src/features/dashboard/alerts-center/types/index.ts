export type AlertSeverity = "critical" | "high" | "medium" | "low";
export type AlertCategory = "sales" | "inventory" | "marketplace" | "financial" | "integration" | "system";
export type AlertStatus = "open" | "acknowledged" | "resolved";

export interface AlertData {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  category: AlertCategory;
  source: string;
  timestamp: string;
  suggestedAction: string;
  status: AlertStatus;
}

export type AlertsState = "loading" | "success" | "empty" | "error";
