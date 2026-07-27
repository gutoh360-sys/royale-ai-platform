export interface BusinessContextUpdated {
  type: "business-context-updated";
  entityType: string;
  entityId: string;
  timestamp: string;
}

export interface InsightsGenerated {
  type: "insights-generated";
  insightType: string;
  productId?: string;
  timestamp: string;
}

export interface DashboardRefreshed {
  type: "dashboard-refreshed";
  timestamp: string;
}

export interface MarketplaceSynced {
  type: "marketplace-synced";
  marketplaceId: string;
  status: "success" | "error";
  timestamp: string;
}

export type DomainEvent =
  | BusinessContextUpdated
  | InsightsGenerated
  | DashboardRefreshed
  | MarketplaceSynced;
