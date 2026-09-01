import { api } from "@/lib/api";
import { toNumber } from "@/lib/api-values";
import { formatCurrency } from "@/lib/format";
import type { Order, SalesChannel } from "@/types/api";
import type { MarketplaceData, MarketplaceSummaryData, MarketplaceDataResult } from "@/features/marketplace/types";
import { groupChannelsByMarketplace, resolveMarketplaceGroup } from "@/features/marketplace/utils/grouping";

function channelOrders(channel: SalesChannel, orders: Order[]): Order[] {
  const channelName = (channel.name ?? "").toLowerCase();
  const channelTipo = (channel.tipo ?? "").toLowerCase();
  const channelId = (channel.bling_id ?? "").toLowerCase();

  return orders.filter((order) => {
    const mp = (order.marketplace ?? "").toLowerCase();
    if (mp === "bling") return false;
    if (channelId && mp === channelId) return true;
    if (channelTipo && mp.includes(channelTipo)) return true;
    if (channelName && mp.includes(channelName)) return true;
    return false;
  });
}

function mapGroupToMarketplace(
  slug: string,
  displayName: string,
  channels: SalesChannel[],
  orders: Order[],
): MarketplaceData {
  const allOrders = channels.flatMap((ch) => channelOrders(ch, orders));
  const revenue = allOrders.reduce((sum, order) => sum + toNumber(order.total_amount), 0);
  const total = allOrders.length;
  const hasAttribution = total > 0;

  const health = channels.every((ch) => ch.situacao === 0) ? 0 : 100;
  const latestUpdate = channels
    .map((ch) => ch.last_synced_at ?? ch.updated_at)
    .sort()
    .reverse()[0] ?? new Date().toISOString();

  return {
    id: slug,
    slug,
    name: displayName,
    logo: displayName.charAt(0).toUpperCase(),
    status: channels.every((ch) => ch.situacao === 0) ? "paused" : "connected",
    revenue: hasAttribution ? revenue : 0,
    formattedRevenue: hasAttribution ? formatCurrency(revenue) : "—",
    orders: hasAttribution ? total : 0,
    formattedOrders: hasAttribution ? String(total) : "—",
    averageTicket: hasAttribution && total > 0 ? revenue / total : 0,
    formattedAverageTicket: hasAttribution && total > 0 ? formatCurrency(revenue / total) : "—",
    growth: 0,
    marketShare: 0,
    formattedMarketShare: "—",
    health,
    lastUpdate: latestUpdate,
    channels,
    channelCount: channels.length,
  };
}

function buildSummary(orders: Order[]): MarketplaceSummaryData {
  const totalRevenue = orders.reduce((s, o) => s + toNumber(o.total_amount), 0);
  const totalOrders = orders.length;

  return {
    totalRevenue: formatCurrency(totalRevenue),
    totalOrders,
    formattedTotalOrders: String(totalOrders),
    averageTicket: totalOrders > 0 ? formatCurrency(totalRevenue / totalOrders) : "—",
    leaderName: "-",
    highestGrowth: 0,
    highestGrowthName: "-",
    averageHealth: 0,
  };
}

export async function fetchMarketplaceData(): Promise<MarketplaceDataResult> {
  try {
    const [channels, orders] = await Promise.all([
      api.get<SalesChannel[]>("/sales-channels"),
      api.get<Order[]>("/orders"),
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
          highestGrowth: 0,
          highestGrowthName: "-",
          averageHealth: 0,
        },
        status: "empty",
        error: null,
      };
    }

    const groups = groupChannelsByMarketplace(channels);
    const marketplaces = Array.from(groups.entries()).map(([slug, group]) =>
      mapGroupToMarketplace(slug, group.displayName, group.channels, orders),
    );

    return {
      marketplaces,
      summary: buildSummary(orders),
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
        highestGrowth: 0,
        highestGrowthName: "-",
        averageHealth: 0,
      },
      status: "error",
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

export { resolveMarketplaceGroup, groupChannelsByMarketplace };
