export type MarketplaceHealth = "excellent" | "good" | "attention" | "critical";
export type MarketplaceStatus = "connected" | "error" | "paused";

export interface MarketplaceData {
  id: string;
  name: string;
  logo: string;
  status: MarketplaceStatus;
  revenue: number;
  formattedRevenue: string;
  orders: number;
  formattedOrders: string;
  averageTicket: number;
  formattedAverageTicket: string;
  growth: number;
  marketShare: number;
  formattedMarketShare: string;
  health: number;
  lastUpdate: string;
}

export interface MarketplaceSummaryData {
  totalRevenue: string;
  totalOrders: number;
  formattedTotalOrders: string;
  averageTicket: string;
  leaderName: string;
  highestGrowth: number;
  highestGrowthName: string;
  averageHealth: number;
}

export type MarketplaceState = "loading" | "success" | "empty" | "error";

export interface MarketplaceDataResult {
  marketplaces: MarketplaceData[];
  summary: MarketplaceSummaryData;
  status: MarketplaceState;
  error: string | null;
}
