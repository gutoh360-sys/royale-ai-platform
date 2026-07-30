"use client";

import { Loader2, AlertCircle, Store } from "lucide-react";
import { ContentContainer } from "@/components/shell/content-container";
import { MarketplaceSummary } from "./marketplace-summary";
import { MarketplaceCard } from "./marketplace-card";
import { useMarketplaceData } from "@/features/marketplace/hooks/use-marketplace-data";

export function MarketplaceOverview() {
  const { marketplaces, summary, status } = useMarketplaceData();

  if (status === "loading") {
    return (
      <ContentContainer>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      </ContentContainer>
    );
  }

  if (status === "error") {
    return (
      <ContentContainer>
        <div className="flex items-center justify-center gap-2 min-h-[400px]">
          <AlertCircle className="size-5 text-destructive" />
          <p className="text-sm text-muted-foreground">Erro ao carregar marketplaces</p>
        </div>
      </ContentContainer>
    );
  }

  if (status === "empty" || marketplaces.length === 0) {
    return (
      <ContentContainer>
        <div className="flex items-center justify-center gap-2 min-h-[400px]">
          <Store className="size-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum marketplace configurado</p>
        </div>
      </ContentContainer>
    );
  }

  return (
    <ContentContainer>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Marketplaces</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Acompanhe a performance de todos os canais de venda
        </p>
      </div>
      <div className="space-y-6">
        <MarketplaceSummary summary={summary} />
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          role="list"
          aria-label="Lista de marketplaces"
        >
          {marketplaces.map((mp) => (
            <MarketplaceCard key={mp.id} marketplace={mp} />
          ))}
        </div>
      </div>
    </ContentContainer>
  );
}
