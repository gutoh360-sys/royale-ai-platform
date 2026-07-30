"use client";

import { useState, useEffect } from "react";
import type { MarketplaceDataResult } from "@/features/marketplace/types";
import { MockMarketplaceDataService } from "@/features/marketplace/services/marketplace-data-service";

export function useMarketplaceData(): MarketplaceDataResult {
  const [result, setResult] = useState<MarketplaceDataResult>({
    marketplaces: [],
    summary: {
      totalRevenue: "R$ 0",
      totalOrders: 0,
      formattedTotalOrders: "0",
      averageTicket: "R$ 0",
      leaderName: "-",
      highestGrowth: 0,
      highestGrowthName: "-",
      averageHealth: 0,
    },
    status: "loading",
    error: null,
  });

  useEffect(() => {
    const service = new MockMarketplaceDataService();

    service.fetch().then((res) => {
      setResult(res);
    });
  }, []);

  return result;
}
