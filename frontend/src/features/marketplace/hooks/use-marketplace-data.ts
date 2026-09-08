"use client";

import { useState, useEffect } from "react";
import type { MarketplaceDataResult } from "@/features/marketplace/types";
import { fetchMarketplaceData } from "@/services/api-marketplace";
import { type Period } from "@/lib/period";

export function useMarketplaceData(period: Period = "30d"): MarketplaceDataResult {
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
    fetchMarketplaceData(period).then(setResult);
  }, [period]);

  return result;
}
