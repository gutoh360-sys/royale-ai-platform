"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { getHealthConfig } from "@/features/marketplace/utils/health";
import type { MarketplaceData } from "@/features/marketplace/types";

interface MarketplaceDetailHeaderProps {
  marketplace: MarketplaceData;
}

export function MarketplaceDetailHeader({ marketplace }: MarketplaceDetailHeaderProps) {
  const health = getHealthConfig(marketplace.health);

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Voltar
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
            {marketplace.logo}
          </div>
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {marketplace.name}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={cn(
                "inline-flex items-center gap-1.5 text-xs font-medium",
                marketplace.status === "connected" ? "text-success" : "text-muted-foreground",
              )}>
                <span className={cn(
                  "size-1.5 rounded-full",
                  marketplace.status === "connected" ? "bg-success" : "bg-muted-foreground",
                )} aria-hidden="true" />
                {marketplace.status === "connected" ? "Conectado" : marketplace.status}
              </span>
              <span className="text-xs text-muted-foreground">
                Última sincronização: {new Date(marketplace.lastUpdate).toLocaleString("pt-BR")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">Saúde</p>
            <p className={cn("text-sm font-semibold", health.color)}>{health.label}</p>
          </div>
          <div className="h-8 w-px bg-border" aria-hidden="true" />
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">Crescimento</p>
            <p className={cn(
              "text-sm font-semibold",
              marketplace.growth >= 0 ? "text-success" : "text-destructive",
            )}>
              {marketplace.growth >= 0 ? "+" : ""}{marketplace.growth}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
