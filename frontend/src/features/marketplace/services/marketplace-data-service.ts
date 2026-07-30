import type { MarketplaceDataResult } from "@/features/marketplace/types";
import { mockMarketplaces, buildMockSummary } from "@/features/marketplace/mocks";

export interface MarketplaceDataService {
  fetch(): Promise<MarketplaceDataResult>;
}

export class MockMarketplaceDataService implements MarketplaceDataService {
  async fetch(): Promise<MarketplaceDataResult> {
    const marketplaces = mockMarketplaces;
    const summary = buildMockSummary(marketplaces);

    return {
      marketplaces,
      summary,
      status: marketplaces.length > 0 ? "success" : "empty",
      error: null,
    };
  }
}
