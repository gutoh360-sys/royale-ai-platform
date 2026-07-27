export interface SyncBusinessContextFlow {
  execute(): Promise<void>;
}

export interface GenerateInsightsFlow {
  execute(productId?: string): Promise<void>;
}

export interface RefreshDashboardFlow {
  execute(): Promise<void>;
}

export interface MarketplaceSyncFlow {
  execute(marketplaceId: string): Promise<void>;
}

export interface FlowResult {
  success: boolean;
  flowName: string;
  duration: number;
  error?: string;
}
