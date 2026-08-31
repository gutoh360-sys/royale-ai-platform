import { api } from "@/lib/api";
import { safeRatio, toNumber } from "@/lib/api-values";
import { formatCurrency } from "@/lib/format";
import type { Order, SalesChannel } from "@/types/api";
import type { MarketplaceData, MarketplaceSummaryData, MarketplaceDataResult } from "@/features/marketplace/types";

const MARKETPLACE_NAMES: Record<string, string> = {
  MERCADO_LIVRE: "Mercado Livre",
  MercadoLivre: "Mercado Livre",
  SHOPEE: "Shopee",
  Shopee: "Shopee",
  AMAZON: "Amazon",
  Amazon: "Amazon",
  MAGAZINELUIZAMKTPLACE: "Magalu",
  "Magazine Luiza": "Magalu",
  TIKTOK: "TikTok Shop",
  "TikTok Shop": "TikTok Shop",
};

function normalizeKey(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function channelDisplayName(channel: SalesChannel): string {
  return MARKETPLACE_NAMES[channel.tipo ?? ""] ?? MARKETPLACE_NAMES[channel.name] ?? channel.name;
}

function channelStatus(channel: SalesChannel): MarketplaceData["status"] {
  return channel.situacao === 0 ? "paused" : "connected";
}

function channelHealth(channel: SalesChannel): number {
  if (channel.situacao === 0) return 0;
  return 100;
}

function channelOrders(channel: SalesChannel, orders: Order[]): Order[] {
  const keys = new Set([
    normalizeKey(channel.bling_id),
    normalizeKey(channel.tipo),
    normalizeKey(channel.name),
    normalizeKey(channelDisplayName(channel)),
  ].filter(Boolean));

  return orders.filter((order) => keys.has(normalizeKey(order.marketplace)));
}

function mapChannelsToMarketplaces(channels: SalesChannel[], orders: Order[]): MarketplaceData[] {
  return channels.map((channel) => {
    const items = channelOrders(channel, orders);
    const revenue = items.reduce((sum, order) => sum + toNumber(order.total_amount), 0);
    const completed = items.filter((order) => order.status === "completed").length;
    const total = items.length;
    const health = total > 0 ? Math.round(safeRatio(completed, total) * 100) : channelHealth(channel);

    return {
      id: channel.id,
      name: channelDisplayName(channel),
      logo: channelDisplayName(channel).charAt(0).toUpperCase(),
      status: channelStatus(channel),
      revenue,
      formattedRevenue: total > 0 ? formatCurrency(revenue) : "—",
      orders: total,
      formattedOrders: total > 0 ? String(total) : "—",
      averageTicket: total > 0 ? revenue / total : 0,
      formattedAverageTicket: total > 0 ? formatCurrency(revenue / total) : "—",
      growth: 0,
      marketShare: 0,
      formattedMarketShare: "—",
      health,
      lastUpdate: channel.last_synced_at ?? channel.updated_at,
    };
  });
}

function groupOrdersByMarketplace(orders: Order[]): MarketplaceData[] {
  const grouped = new Map<string, Order[]>();

  for (const order of orders) {
    const key = order.marketplace;
    if (!key || normalizeKey(key) === "bling") continue;
    const arr = grouped.get(key) ?? [];
    arr.push(order);
    grouped.set(key, arr);
  }

  return Array.from(grouped.entries()).map(([key, items]) => {
    const revenue = items.reduce((s, o) => s + toNumber(o.total_amount), 0);
    const completed = items.filter((o) => o.status === "completed").length;
    const total = items.length;

    return {
      id: key,
      name: MARKETPLACE_NAMES[key] ?? key,
      logo: key.charAt(0).toUpperCase(),
      status: "connected" as const,
      revenue,
      formattedRevenue: formatCurrency(revenue),
      orders: total,
      formattedOrders: String(total),
      averageTicket: total > 0 ? revenue / total : 0,
      formattedAverageTicket: formatCurrency(total > 0 ? revenue / total : 0),
      growth: 0,
      marketShare: 0,
      formattedMarketShare: "0%",
      health: Math.min(100, Math.round(safeRatio(completed, total) * 100)),
      lastUpdate: items[0]?.last_synced_at ?? new Date().toISOString(),
    };
  });
}

function buildSummary(marketplaces: MarketplaceData[], orders: Order[]): MarketplaceSummaryData {
  const totalRevenue = orders.reduce((sum, order) => sum + toNumber(order.total_amount), 0);
  const totalOrders = orders.length;
  const leader = [...marketplaces].filter((m) => m.orders > 0).sort((a, b) => b.revenue - a.revenue)[0];

  return {
    totalRevenue: formatCurrency(totalRevenue),
    totalOrders,
    formattedTotalOrders: String(totalOrders),
    averageTicket: totalOrders > 0 ? formatCurrency(totalRevenue / totalOrders) : "—",
    leaderName: leader?.name ?? "-",
    highestGrowth: 0,
    highestGrowthName: "-",
    averageHealth:
      marketplaces.length > 0
        ? Math.round(marketplaces.reduce((s, m) => s + m.health, 0) / marketplaces.length)
        : 0,
  };
}

export async function fetchMarketplaceData(): Promise<MarketplaceDataResult> {
  try {
    const [channels, orders] = await Promise.all([
      api.get<SalesChannel[]>("/sales-channels"),
      api.get<Order[]>("/orders"),
    ]);
    const marketplaces = channels.length > 0
      ? mapChannelsToMarketplaces(channels, orders)
      : groupOrdersByMarketplace(orders);

    if (marketplaces.length === 0) {
      return {
        marketplaces: [],
        summary: {
          totalRevenue: formatCurrency(0),
          totalOrders: 0,
          formattedTotalOrders: "0",
          averageTicket: formatCurrency(0),
          leaderName: "-",
          highestGrowth: 0,
          highestGrowthName: "-",
          averageHealth: 0,
        },
        status: "empty",
        error: null,
      };
    }

    return {
      marketplaces,
      summary: buildSummary(marketplaces, orders),
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
        averageTicket: formatCurrency(0),
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
