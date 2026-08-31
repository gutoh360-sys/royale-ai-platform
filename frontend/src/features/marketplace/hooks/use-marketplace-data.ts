"use client";

import { useState, useEffect } from "react";
import type { MarketplaceDataResult } from "@/features/marketplace/types";
import { fetchMarketplaceData } from "@/services/api-marketplace";

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
    fetchMarketplaceData().then(setResult);
  }, []);

  return result;
}
