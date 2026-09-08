import { api } from "@/lib/api";
import { toNumber } from "@/lib/api-values";
import { formatCurrency } from "@/lib/format";
import { type Period } from "@/lib/period";

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
import type { Order, SalesChannel } from "@/types/api";
import type { MarketplaceData, MarketplaceSummaryData, MarketplaceDataResult } from "@/features/marketplace/types";
import { groupChannelsByMarketplace, resolveMarketplaceGroup } from "@/features/marketplace/utils/grouping";

function ordersForChannels(channels: SalesChannel[], orders: Order[]): Order[] {
  const channelIds = new Set(channels.map((ch) => ch.id));
  return orders.filter((order) => order.channel_id && channelIds.has(order.channel_id));
}

function mapGroupToMarketplace(
  slug: string,
  displayName: string,
  channels: SalesChannel[],
  currentOrders: Order[],
  previousOrders: Order[],
): MarketplaceData {
  const allCurrentOrders = ordersForChannels(channels, currentOrders);
  const allPreviousOrders = ordersForChannels(channels, previousOrders);
  const currentRevenue = allCurrentOrders.reduce((sum, order) => sum + toNumber(order.total_amount), 0);
  const previousRevenue = allPreviousOrders.reduce((sum, order) => sum + toNumber(order.total_amount), 0);
  const total = allCurrentOrders.length;
  const hasAttribution = total > 0;

  const health = channels.every((ch) => ch.situacao === 0) ? 0 : 100;
  const latestUpdate = channels
    .map((ch) => ch.last_synced_at ?? ch.updated_at)
    .sort()
    .reverse()[0] ?? new Date().toISOString();

  const growth = previousRevenue === 0
    ? null
    : ((currentRevenue - previousRevenue) / previousRevenue) * 100;

  return {
    id: slug,
    slug,
    name: displayName,
    logo: displayName.charAt(0).toUpperCase(),
    status: channels.every((ch) => ch.situacao === 0) ? "paused" : "connected",
    revenue: hasAttribution ? currentRevenue : 0,
    formattedRevenue: hasAttribution ? formatCurrency(currentRevenue) : "—",
    orders: hasAttribution ? total : 0,
    formattedOrders: hasAttribution ? String(total) : "—",
    averageTicket: hasAttribution && total > 0 ? currentRevenue / total : 0,
    formattedAverageTicket: hasAttribution && total > 0 ? formatCurrency(currentRevenue / total) : "—",
    growth,
    marketShare: 0,
    formattedMarketShare: "—",
    health,
    lastUpdate: latestUpdate,
    channels,
    channelCount: channels.length,
  };
}

function buildSummary(orders: Order[], marketplaces: MarketplaceData[]): MarketplaceSummaryData {
  const totalRevenue = orders.reduce((s, o) => s + toNumber(o.total_amount), 0);
  const totalOrders = orders.length;
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
    const [channels, currentOrders, previousOrders] = await Promise.all([
      api.get<SalesChannel[]>("/sales-channels"),
      api.get<Order[]>(`/orders?period=${period}`),
      api.get<Order[]>(`/orders?period=${previousPeriod}`),
    ]);

    if (channels.length === 0) {
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

    const groups = groupChannelsByMarketplace(channels);
    const marketplaces = Array.from(groups.entries()).map(([slug, group]) =>
      mapGroupToMarketplace(slug, group.displayName, group.channels, currentOrders, previousOrders),
    );

    return {
      marketplaces,
      summary: buildSummary(currentOrders, marketplaces),
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

export { resolveMarketplaceGroup, groupChannelsByMarketplace };
