"use client";

import { useState } from "react";
import { Loader2, AlertCircle, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContentContainer } from "@/components/shell/content-container";
import { MarketplaceSummary } from "./marketplace-summary";
import { MarketplaceCard } from "./marketplace-card";
import { useMarketplaceData } from "@/features/marketplace/hooks/use-marketplace-data";
import { PERIOD_OPTIONS, type Period } from "@/lib/period";

export function MarketplaceOverview() {
  const [activePeriod, setActivePeriod] = useState<Period>("30d");
  const { marketplaces, summary, status } = useMarketplaceData(activePeriod);

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Marketplaces</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhe a performance de todos os canais de venda
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-0.5" role="tablist" aria-label="Selecionar período">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setActivePeriod(opt.value)}
              role="tab"
              aria-selected={activePeriod === opt.value}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                activePeriod === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
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
