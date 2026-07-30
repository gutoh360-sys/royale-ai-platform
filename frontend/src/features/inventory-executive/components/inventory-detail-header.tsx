"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InventoryData } from "@/features/inventory-executive/types";

interface InventoryDetailHeaderProps {
  inventory: InventoryData;
}

export function InventoryDetailHeader({ inventory }: InventoryDetailHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
            I
          </div>
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {inventory.name}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-muted-foreground">
                Ultima atualizacao: {new Date(inventory.lastUpdate).toLocaleString("pt-BR")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">Saude do Estoque</p>
            <p className={cn(
              "text-sm font-semibold",
              inventory.health >= 70 ? "text-success" : inventory.health >= 50 ? "text-warning" : "text-destructive",
            )}>
              {inventory.health >= 90 ? "Excelente" : inventory.health >= 70 ? "Boa" : inventory.health >= 50 ? "Atencao" : "Critica"}
            </p>
          </div>
          <div className="h-8 w-px bg-border" aria-hidden="true" />
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">Capital Imobilizado</p>
            <p className="text-sm font-semibold">{inventory.formattedImmobilizedCapital}</p>
          </div>
          <div className="h-8 w-px bg-border" aria-hidden="true" />
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">Giro Medio</p>
            <p className="text-sm font-semibold">{inventory.formattedAverageTurnover}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-[11px] text-muted-foreground border-t border-border/30 pt-3">
        <Link
          href="/inventory/decisions"
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
        >
          Centro de Decisoes
          <ArrowRight className="size-3" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
