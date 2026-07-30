"use client";

import { useState, useMemo } from "react";
import { DefaultInventoryIntelligenceService } from "@/features/inventory-intelligence/services/inventory-intelligence-service";
import { mockStockProducts } from "@/features/inventory-intelligence/mocks";
import type { InventoryAnalysis } from "@/features/inventory-intelligence/types";
import type { InventoryDecisionData, FilterMode } from "@/features/inventory-decision-center/types";

const refDate = new Date("2026-07-27");

export function generateObservations(
  analyses: InventoryAnalysis[],
  summary: InventoryDecisionData["summary"],
): string[] {
  const obs: string[] = [];

  const aProductsAtRisk = analyses.filter(
    (a) => a.abcClass === "A" && (a.stockStatus === "out_of_stock" || a.stockStatus === "stockout_risk"),
  );
  if (aProductsAtRisk.length > 0) {
    obs.push(`Existem ${aProductsAtRisk.length} produto${aProductsAtRisk.length > 1 ? "s" : ""} classificado${aProductsAtRisk.length > 1 ? "s" : ""} como Curva A em risco de ruptura.`);
  }

  if (summary.slowMovingCount > 0) {
    obs.push(`${summary.slowMovingCount} produto${summary.slowMovingCount > 1 ? "s" : ""} não possui${summary.slowMovingCount > 1 ? "m" : ""} venda há mais de 60 dias.`);
  }

  const overstockCount = summary.overstockCount;
  if (overstockCount > 0) {
    obs.push(`Existem ${overstockCount} produto${overstockCount > 1 ? "s" : ""} com estoque acima do máximo recomendado.`);
  }

  const outOfStockAndCritical = analyses.filter(
    (a) => a.stockStatus === "out_of_stock" && a.replenishmentPriority === "critical",
  );
  if (outOfStockAndCritical.length > 0) {
    obs.push(`${outOfStockAndCritical.length} produto${outOfStockAndCritical.length > 1 ? "s" : ""} em ruptura${outOfStockAndCritical.length > 1 ? "" : ""} requer${outOfStockAndCritical.length > 1 ? "em" : ""} compra imediata.`);
  }

  if (summary.idleCapitalProductCount > 0 && summary.idleCapitalValue > 0) {
    obs.push(`Capital parado estimado em R$ ${summary.idleCapitalValue.toLocaleString("pt-BR")} em ${summary.idleCapitalProductCount} produto${summary.idleCapitalProductCount > 1 ? "s" : ""} sem giro ou com excesso de estoque.`);
  }

  return obs;
}

export function useInventoryDecision() {
  const [filter, setFilter] = useState<FilterMode>("all");

  const service = useMemo(() => new DefaultInventoryIntelligenceService(), []);
  const analyses = useMemo(
    () => service.analyzeProducts(mockStockProducts, refDate),
    [service],
  );
  const summary = useMemo(() => service.buildSummary(analyses), [service, analyses]);
  const observations = useMemo(() => generateObservations(analyses, summary), [analyses, summary]);

  const data: InventoryDecisionData = { summary, analyses, observations };

  const filteredAnalyses = useMemo(() => {
    if (filter === "all") return analyses;
    if (filter === "critical") return analyses.filter((a) => a.replenishmentPriority === "critical" || a.replenishmentPriority === "high");
    if (filter === "risk") return analyses.filter((a) => a.stockStatus === "out_of_stock" || a.stockStatus === "stockout_risk" || a.stockStatus === "low_stock");
    if (filter === "slow") return analyses.filter((a) => a.stockStatus === "slow_moving" || a.stockStatus === "inactive");
    if (filter === "healthy") return analyses.filter((a) => a.stockStatus === "healthy");
    return [];
  }, [analyses, filter]);

  return { data, loading: false, filter, setFilter, filteredAnalyses };
}
