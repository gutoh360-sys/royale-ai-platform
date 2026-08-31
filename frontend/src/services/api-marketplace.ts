import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import type { Order } from "@/types/api";
import type { MarketplaceData, MarketplaceSummaryData, MarketplaceDataResult } from "@/features/marketplace/types";

const MARKETPLACE_NAMES: Record<string, string> = {
  bling: "Bling",
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

function groupOrdersByMarketplace(orders: Order[]): MarketplaceData[] {
  const grouped = new Map<string, Order[]>();

  for (const order of orders) {
    const key = order.marketplace || "bling";
    const arr = grouped.get(key) ?? [];
    arr.push(order);
    grouped.set(key, arr);
  }

  return Array.from(grouped.entries()).map(([key, items]) => {
    const revenue = items.reduce((s, o) => s + o.total_amount, 0);
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
      health: total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0,
      lastUpdate: items[0]?.last_synced_at ?? new Date().toISOString(),
    };
  });
}

function buildSummary(marketplaces: MarketplaceData[]): MarketplaceSummaryData {
  const totalRevenue = marketplaces.reduce((s, m) => s + m.revenue, 0);
  const totalOrders = marketplaces.reduce((s, m) => s + m.orders, 0);
  const leader = [...marketplaces].sort((a, b) => b.revenue - a.revenue)[0];

  return {
    totalRevenue: formatCurrency(totalRevenue),
    totalOrders,
    formattedTotalOrders: String(totalOrders),
    averageTicket: formatCurrency(totalOrders > 0 ? totalRevenue / totalOrders : 0),
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
    const orders = await api.get<Order[]>("/orders");
    const marketplaces = groupOrdersByMarketplace(orders);

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
      summary: buildSummary(marketplaces),
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
