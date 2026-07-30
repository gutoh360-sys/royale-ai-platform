"use client";

import { cn } from "@/lib/utils";
import type { FinancialData } from "@/features/financial-executive/types";

interface FinancialDetailHeaderProps {
  financial: FinancialData;
}

export function FinancialDetailHeader({ financial }: FinancialDetailHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
            $
          </div>
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {financial.name}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-muted-foreground">
                Ultima atualizacao: {new Date(financial.lastUpdate).toLocaleString("pt-BR")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">Saude Financeira</p>
            <p className={cn(
              "text-sm font-semibold",
              financial.health >= 70 ? "text-success" : financial.health >= 50 ? "text-warning" : "text-destructive",
            )}>
              {financial.health >= 90 ? "Excelente" : financial.health >= 70 ? "Boa" : financial.health >= 50 ? "Atencao" : "Critica"}
            </p>
          </div>
          <div className="h-8 w-px bg-border" aria-hidden="true" />
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">Crescimento</p>
            <p className={cn(
              "text-sm font-semibold",
              financial.growth >= 0 ? "text-success" : "text-destructive",
            )}>
              {financial.growth >= 0 ? "+" : ""}{financial.growth}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
