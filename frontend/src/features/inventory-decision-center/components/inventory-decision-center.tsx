"use client";

import { Loader2 } from "lucide-react";
import { ContentContainer } from "@/components/shell/content-container";
import { ExecutiveInventorySummary } from "./executive-inventory-summary";
import { CriticalProductsList } from "./critical-products-list";
import { PurchaseSummary } from "./purchase-summary";
import { InventoryObservationPanel } from "./inventory-observation-panel";
import { useInventoryDecision } from "@/features/inventory-decision-center/hooks/use-inventory-decision";

export function InventoryDecisionCenter() {
  const { data, loading, filter, setFilter, filteredAnalyses } = useInventoryDecision();

  if (loading) {
    return (
      <ContentContainer>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      </ContentContainer>
    );
  }

  if (!data) return null;

  return (
    <ContentContainer>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Centro de Decisão — Estoque</h1>
        <p className="text-sm text-muted-foreground mt-1">O que precisa da sua atenção hoje</p>
      </div>
      <div className="space-y-6">
        <ExecutiveInventorySummary summary={data.summary} />
        <CriticalProductsList
          products={filteredAnalyses}
          filter={filter}
          onFilterChange={setFilter}
        />
        <PurchaseSummary summary={data.summary} />
        <InventoryObservationPanel observations={data.observations} />
      </div>
    </ContentContainer>
  );
}
