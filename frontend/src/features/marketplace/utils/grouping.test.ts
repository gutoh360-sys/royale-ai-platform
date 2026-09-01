import { describe, it, expect } from "vitest";
import { resolveMarketplaceGroup, groupChannelsByMarketplace } from "./grouping";
import type { SalesChannel } from "@/types/api";

function makeChannel(overrides: Partial<SalesChannel> & { name: string }): SalesChannel {
  return {
    id: overrides.id ?? `ch-${Math.random().toString(36).slice(2, 8)}`,
    bling_id: overrides.bling_id ?? "100",
    name: overrides.name,
    tipo: overrides.tipo ?? null,
    agrupador: overrides.agrupador ?? null,
    situacao: overrides.situacao ?? 1,
    created_at: overrides.created_at ?? "2025-01-01T00:00:00Z",
    updated_at: overrides.updated_at ?? "2025-01-01T00:00:00Z",
    last_synced_at: overrides.last_synced_at ?? null,
  };
}

describe("resolveMarketplaceGroup", () => {
  it("groups Amazon and Amazon Seller under amazon", () => {
    expect(resolveMarketplaceGroup(makeChannel({ name: "Amazon" }))).toEqual({
      slug: "amazon",
      displayName: "Amazon",
    });
    expect(resolveMarketplaceGroup(makeChannel({ name: "Amazon Seller" }))).toEqual({
      slug: "amazon",
      displayName: "Amazon",
    });
    expect(resolveMarketplaceGroup(makeChannel({ name: "AMAZON" }))).toEqual({
      slug: "amazon",
      displayName: "Amazon",
    });
  });

  it("groups Mercado Livre variations under mercado-livre", () => {
    expect(resolveMarketplaceGroup(makeChannel({ name: "Mercado Livre" }))).toEqual({
      slug: "mercado-livre",
      displayName: "Mercado Livre",
    });
    expect(resolveMarketplaceGroup(makeChannel({ name: "Mercado Livre Full" }))).toEqual({
      slug: "mercado-livre",
      displayName: "Mercado Livre",
    });
    expect(resolveMarketplaceGroup(makeChannel({ name: "Mercado Livre Royale Store" }))).toEqual({
      slug: "mercado-livre",
      displayName: "Mercado Livre",
    });
  });

  it("groups Shopee variations under shopee", () => {
    expect(resolveMarketplaceGroup(makeChannel({ name: "Shopee" }))).toEqual({
      slug: "shopee",
      displayName: "Shopee",
    });
    expect(resolveMarketplaceGroup(makeChannel({ name: "Shopee Loja Oficial" }))).toEqual({
      slug: "shopee",
      displayName: "Shopee",
    });
  });

  it("groups Magazine Luiza / Magalu under magazine-luiza", () => {
    expect(resolveMarketplaceGroup(makeChannel({ name: "Magazine Luiza" }))).toEqual({
      slug: "magazine-luiza",
      displayName: "Magazine Luiza",
    });
    expect(resolveMarketplaceGroup(makeChannel({ name: "MAGALU" }))).toEqual({
      slug: "magazine-luiza",
      displayName: "Magazine Luiza",
    });
    expect(resolveMarketplaceGroup(makeChannel({ name: "Loja Magazine Luiza" }))).toEqual({
      slug: "magazine-luiza",
      displayName: "Magazine Luiza",
    });
  });

  it("groups TikTok Shop under tiktok-shop", () => {
    expect(resolveMarketplaceGroup(makeChannel({ name: "TikTok Shop" }))).toEqual({
      slug: "tiktok-shop",
      displayName: "TikTok Shop",
    });
    expect(resolveMarketplaceGroup(makeChannel({ name: "Loja TikTok Shop" }))).toEqual({
      slug: "tiktok-shop",
      displayName: "TikTok Shop",
    });
  });

  it("uses tipo field for grouping when available", () => {
    expect(resolveMarketplaceGroup(makeChannel({ name: "Minha Loja", tipo: "AMAZON" }))).toEqual({
      slug: "amazon",
      displayName: "Amazon",
    });
  });

  it("does not aggressively group unknown channels", () => {
    const result = resolveMarketplaceGroup(makeChannel({ name: "Minha Loja Virtual" }));
    expect(result.slug).not.toBe("amazon");
    expect(result.slug).not.toBe("mercado-livre");
    expect(result.displayName).toBe("Minha Loja Virtual");
  });

  it("creates own group for completely unknown channel", () => {
    const result = resolveMarketplaceGroup(makeChannel({ name: "Canal Independente" }));
    expect(result.slug).toBe("canalindependente");
    expect(result.displayName).toBe("Canal Independente");
  });
});

describe("groupChannelsByMarketplace", () => {
  it("groups Amazon + Amazon Seller into 1 group with 2 channels", () => {
    const channels = [
      makeChannel({ name: "Amazon", id: "ch-1" }),
      makeChannel({ name: "Amazon Seller", id: "ch-2" }),
    ];
    const groups = groupChannelsByMarketplace(channels);
    expect(groups.size).toBe(1);
    const amazon = groups.get("amazon");
    expect(amazon).toBeDefined();
    expect(amazon!.channels).toHaveLength(2);
    expect(amazon!.displayName).toBe("Amazon");
  });

  it("groups multiple Mercado Livre into 1 group", () => {
    const channels = [
      makeChannel({ name: "Mercado Livre", id: "ch-1" }),
      makeChannel({ name: "Mercado Livre Full", id: "ch-2" }),
      makeChannel({ name: "Mercado Livre Royale Store", id: "ch-3" }),
    ];
    const groups = groupChannelsByMarketplace(channels);
    expect(groups.size).toBe(1);
    expect(groups.get("mercado-livre")!.channels).toHaveLength(3);
  });

  it("groups Shopee correctly", () => {
    const channels = [
      makeChannel({ name: "Shopee", id: "ch-1" }),
      makeChannel({ name: "Shopee Loja Oficial", id: "ch-2" }),
    ];
    const groups = groupChannelsByMarketplace(channels);
    expect(groups.size).toBe(1);
    expect(groups.get("shopee")!.channels).toHaveLength(2);
  });

  it("groups Magazine Luiza and Magalu into same group", () => {
    const channels = [
      makeChannel({ name: "Magazine Luiza", id: "ch-1" }),
      makeChannel({ name: "MAGALU", id: "ch-2" }),
    ];
    const groups = groupChannelsByMarketplace(channels);
    expect(groups.size).toBe(1);
    expect(groups.get("magazine-luiza")!.channels).toHaveLength(2);
  });

  it("groups TikTok Shop correctly", () => {
    const channels = [
      makeChannel({ name: "TikTok Shop", id: "ch-1" }),
    ];
    const groups = groupChannelsByMarketplace(channels);
    expect(groups.size).toBe(1);
    expect(groups.get("tiktok-shop")!.channels).toHaveLength(1);
  });

  it("unknown channels create their own group", () => {
    const channels = [
      makeChannel({ name: "Canal Independente", id: "ch-1" }),
    ];
    const groups = groupChannelsByMarketplace(channels);
    expect(groups.size).toBe(1);
    expect(groups.get("canalindependente")).toBeDefined();
  });

  it("preserves all original SalesChannel objects", () => {
    const ch1 = makeChannel({ name: "Amazon", id: "ch-1", bling_id: "100" });
    const ch2 = makeChannel({ name: "Amazon Seller", id: "ch-2", bling_id: "200" });
    const groups = groupChannelsByMarketplace([ch1, ch2]);
    const amazon = groups.get("amazon")!;
    expect(amazon.channels[0]).toBe(ch1);
    expect(amazon.channels[1]).toBe(ch2);
  });

  it("mixed channels produce correct number of groups", () => {
    const channels = [
      makeChannel({ name: "Amazon", id: "ch-1" }),
      makeChannel({ name: "Amazon Seller", id: "ch-2" }),
      makeChannel({ name: "Mercado Livre", id: "ch-3" }),
      makeChannel({ name: "Mercado Livre Full", id: "ch-4" }),
      makeChannel({ name: "Shopee", id: "ch-5" }),
      makeChannel({ name: "Canal Extra", id: "ch-6" }),
    ];
    const groups = groupChannelsByMarketplace(channels);
    expect(groups.size).toBe(4);
    expect(groups.get("amazon")!.channels).toHaveLength(2);
    expect(groups.get("mercado-livre")!.channels).toHaveLength(2);
    expect(groups.get("shopee")!.channels).toHaveLength(1);
    expect(groups.get("canalextra")!.channels).toHaveLength(1);
  });
});
