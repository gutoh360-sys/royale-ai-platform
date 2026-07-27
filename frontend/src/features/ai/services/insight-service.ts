export interface AIInsightService {
  getSalesInsights(period: string): Promise<string[]>;
  getInventoryInsights(): Promise<string[]>;
  getMarketplaceInsights(marketplace: string): Promise<string[]>;
}
