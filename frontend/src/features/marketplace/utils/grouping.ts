import type { SalesChannel } from "@/types/api";

interface GroupRule {
  slug: string;
  displayName: string;
  matches: (normalized: string) => boolean;
}

const GROUP_RULES: GroupRule[] = [
  {
    slug: "amazon",
    displayName: "Amazon",
    matches: (n) => n.includes("amazon"),
  },
  {
    slug: "mercado-livre",
    displayName: "Mercado Livre",
    matches: (n) => n.includes("mercadolivre") || n.includes("mercado_livre") || n.includes("mercadolivre"),
  },
  {
    slug: "shopee",
    displayName: "Shopee",
    matches: (n) => n.includes("shopee"),
  },
  {
    slug: "magazine-luiza",
    displayName: "Magazine Luiza",
    matches: (n) => n.includes("magalu") || n.includes("magazineluiza") || n.includes("magazine luiza"),
  },
  {
    slug: "tiktok-shop",
    displayName: "TikTok Shop",
    matches: (n) => n.includes("tiktok"),
  },
];

function normalizeForGrouping(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function resolveMarketplaceGroup(channel: SalesChannel): {
  slug: string;
  displayName: string;
} {
  const candidates = [
    channel.tipo ?? "",
    channel.name,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeForGrouping(candidate);
    if (!normalized) continue;

    for (const rule of GROUP_RULES) {
      if (rule.matches(normalized)) {
        return { slug: rule.slug, displayName: rule.displayName };
      }
    }
  }

  const fallbackName = channel.tipo ?? channel.name;
  const fallbackSlug = normalizeForGrouping(fallbackName) || "outro";
  return { slug: fallbackSlug, displayName: fallbackName || "Outro" };
}

export function groupChannelsByMarketplace(
  channels: SalesChannel[],
): Map<string, { slug: string; displayName: string; channels: SalesChannel[] }> {
  const groups = new Map<string, { slug: string; displayName: string; channels: SalesChannel[] }>();

  for (const channel of channels) {
    const { slug, displayName } = resolveMarketplaceGroup(channel);
    const existing = groups.get(slug);
    if (existing) {
      existing.channels.push(channel);
    } else {
      groups.set(slug, { slug, displayName, channels: [channel] });
    }
  }

  return groups;
}

export function marketplaceSlugFromGroup(slug: string): string {
  return slug;
}
