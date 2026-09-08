import { api } from "@/lib/api";
import { toNumber } from "@/lib/api-values";
import { formatCurrency } from "@/lib/format";
import { type Period } from "@/lib/period";

interface MarketplaceRevenueItem {
  channel_id: string | null;
  channel_name: string;
  marketplace_slug: string;
  total_orders: number;
  total_revenue: number;
  average_ticket: number;
}

interface MarketplaceRevenueResponse {
  marketplaces: MarketplaceRevenueItem[];
  total_orders: number;
  total_revenue: number;
  period: string;
}

function getPreviousPeriod(period: Period): Period {
  const map: Record<Period, Period> = {
    "today": "7d",
    "7d": "30d",
    "30d": "90d",
    "90d": "12m",
    "12m": "12m",
  };
  return map[period];
}

import type { SalesChannel } from "@/types/api";
import type { MarketplaceData, MarketplaceSummaryData, MarketplaceDataResult } from "@/features/marketplace/types";
import { groupChannelsByMarketplace } from "@/features/marketplace/utils/grouping";

function mapItemToMarketplace(
  item: MarketplaceRevenueItem,
  channels: SalesChannel[],
  previousRevenue: number,
  previousOrders: number,
): MarketplaceData {
  const currentRevenue = item.total_revenue;
  const total = item.total_orders;
  const growth = previousRevenue === 0
    ? null
    : ((currentRevenue - previousRevenue) / previousRevenue) * 100;

  const matchedChannels = channels.filter(
    (ch) => ch.id === item.channel_id || ch.name?.toLowerCase() === item.channel_name.toLowerCase(),
  );

  return {
    id: item.marketplace_slug,
    slug: item.marketplace_slug,
    name: item.channel_name,
    logo: item.channel_name.charAt(0).toUpperCase(),
    status: matchedChannels.length > 0
      ? (matchedChannels.every((ch) => ch.situacao === 0) ? "paused" : "connected")
      : "connected",
    revenue: currentRevenue,
    formattedRevenue: formatCurrency(currentRevenue),
    orders: total,
    formattedOrders: String(total),
    averageTicket: total > 0 ? currentRevenue / total : 0,
    formattedAverageTicket: total > 0 ? formatCurrency(currentRevenue / total) : formatCurrency(0),
    growth,
    marketShare: 0,
    formattedMarketShare: "0%",
    health: 100,
    lastUpdate: matchedChannels[0]?.last_synced_at ?? matchedChannels[0]?.updated_at ?? new Date().toISOString(),
    channels: matchedChannels,
    channelCount: matchedChannels.length,
  };
}

function buildSummaryFromRevenue(
  items: MarketplaceRevenueItem[],
  totalOrders: number,
  totalRevenue: number,
  marketplaces: MarketplaceData[],
): MarketplaceSummaryData {
  const withOrders = marketplaces.filter((m) => m.orders > 0);
  const leader = [...withOrders].sort((a, b) => b.revenue - a.revenue)[0];
  const withGrowth = marketplaces.filter((m) => m.growth !== null);
  const highestGrowthEntry = [...withGrowth].sort((a, b) => (b.growth ?? 0) - (a.growth ?? 0))[0];

  return {
    totalRevenue: formatCurrency(totalRevenue),
    totalOrders,
    formattedTotalOrders: String(totalOrders),
    averageTicket: totalOrders > 0 ? formatCurrency(totalRevenue / totalOrders) : "—",
    leaderName: leader?.name ?? "-",
    highestGrowth: highestGrowthEntry?.growth ?? null,
    highestGrowthName: highestGrowthEntry?.name ?? "-",
    averageHealth: 0,
  };
}

export async function fetchMarketplaceData(period: Period = "30d"): Promise<MarketplaceDataResult> {
  try {
    const previousPeriod = getPreviousPeriod(period);
    const [channels, currentRevenueData, previousRevenueData] = await Promise.all([
      api.get<SalesChannel[]>("/sales-channels"),
      api.get<MarketplaceRevenueResponse>(`/analytics/marketplace-revenue?period=${period}`),
      api.get<MarketplaceRevenueResponse>(`/analytics/marketplace-revenue?period=${previousPeriod}`),
    ]);

    if (channels.length === 0 && currentRevenueData.marketplaces.length === 0) {
      return {
        marketplaces: [],
        summary: {
          totalRevenue: formatCurrency(0),
          totalOrders: 0,
          formattedTotalOrders: "0",
          averageTicket: "—",
          leaderName: "-",
          highestGrowth: null,
          highestGrowthName: "-",
          averageHealth: 0,
        },
        status: "empty",
        error: null,
      };
    }

    const previousRevMap = new Map(
      previousRevenueData.marketplaces.map((p) => [p.marketplace_slug, { revenue: p.total_revenue, orders: p.total_orders }]),
    );

    const marketplaces = currentRevenueData.marketplaces.map((item) => {
      const prev = previousRevMap.get(item.marketplace_slug);
      return mapItemToMarketplace(item, channels, prev?.revenue ?? 0, prev?.orders ?? 0);
    });

    return {
      marketplaces,
      summary: buildSummaryFromRevenue(
        currentRevenueData.marketplaces,
        currentRevenueData.total_orders,
        currentRevenueData.total_revenue,
        marketplaces,
      ),
      status: "success",
      error: null,
    };
  } catch (e) {
    return {
      marketplaces: [],
      summary: {
        totalRevenue: formatCurrency(0),
        totalOrders: 0,
        formattedTotalOrders: "0",
        averageTicket: "—",
        leaderName: "-",
        highestGrowth: null,
        highestGrowthName: "-",
        averageHealth: 0,
      },
      status: "error",
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

export { groupChannelsByMarketplace };
