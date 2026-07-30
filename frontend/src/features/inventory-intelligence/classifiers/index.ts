import type { StockProduct, StockStatus, AbcClass, ReplenishmentPriority, InventoryAnalysis } from "@/features/inventory-intelligence/types";
import {
  ABC_CLASS_A_LIMIT,
  ABC_CLASS_B_LIMIT,
  CRITICAL_COVERAGE_DAYS,
  HIGH_COVERAGE_DAYS,
  SLOW_MOVING_DAYS,
  REPLENISHMENT_WEIGHTS,
  REPLENISHMENT_SCORE_MAX,
} from "@/features/inventory-intelligence/constants";
import { clamp } from "@/features/inventory-intelligence/utils";

export function classifyStockStatus(
  product: StockProduct,
  availableStock: number,
  projectedAfterLeadTime: number,
  daysSinceLastSale: number,
): StockStatus {
  if (!product.active) return "inactive";
  if (availableStock <= 0) return "out_of_stock";
  if (projectedAfterLeadTime <= 0 && product.averageDailySales > 0) return "stockout_risk";
  if (availableStock <= product.minimumStock) return "low_stock";
  if (availableStock > 0 && product.averageDailySales === 0 && daysSinceLastSale >= SLOW_MOVING_DAYS) return "slow_moving";
  if (availableStock > product.maximumStock) return "overstock";
  return "healthy";
}

export function classifyAbc(products: { product: StockProduct; salesValue: number }[]): Map<string, AbcClass> {
  const result = new Map<string, AbcClass>();
  if (products.length === 0) return result;

  const sorted = [...products].sort((a, b) => b.salesValue - a.salesValue);
  const totalValue = sorted.reduce((sum, p) => sum + p.salesValue, 0);

  if (totalValue === 0) {
    for (const p of sorted) {
      result.set(p.product.id, "C");
    }
    return result;
  }

  let cumulative = 0;
  for (const p of sorted) {
    const prevFraction = cumulative / totalValue;
    cumulative += p.salesValue;
    const fraction = cumulative / totalValue;

    if (fraction <= ABC_CLASS_A_LIMIT) {
      result.set(p.product.id, "A");
    } else if (prevFraction < ABC_CLASS_A_LIMIT) {
      result.set(p.product.id, "A");
    } else if (fraction <= ABC_CLASS_B_LIMIT) {
      result.set(p.product.id, "B");
    } else if (prevFraction < ABC_CLASS_B_LIMIT) {
      result.set(p.product.id, "B");
    } else {
      result.set(p.product.id, "C");
    }
  }

  return result;
}

export function calculateReplenishmentScore(analysis: InventoryAnalysis): number {
  const { stockStatus, stockCoverageDays, abcClass, suggestedPurchaseQuantity } = analysis;
  let score = 0;

  if (stockStatus === "inactive") return 0;

  if (stockStatus === "out_of_stock") {
    score += REPLENISHMENT_WEIGHTS.stockoutRisk;
  } else if (stockStatus === "stockout_risk") {
    score += REPLENISHMENT_WEIGHTS.stockoutRisk * 0.8;
  }

  if (stockCoverageDays !== null) {
    if (stockCoverageDays <= CRITICAL_COVERAGE_DAYS) {
      score += REPLENISHMENT_WEIGHTS.coverageDays;
    } else if (stockCoverageDays <= HIGH_COVERAGE_DAYS) {
      score += REPLENISHMENT_WEIGHTS.coverageDays * 0.5;
    }
  }

  if (abcClass === "A") {
    score += REPLENISHMENT_WEIGHTS.abcClass;
  } else if (abcClass === "B") {
    score += REPLENISHMENT_WEIGHTS.abcClass * 0.5;
  }

  if (suggestedPurchaseQuantity > 0) {
    score += REPLENISHMENT_WEIGHTS.projectedStock;
  }

  return clamp(Math.round(score), 0, REPLENISHMENT_SCORE_MAX);
}

export function classifyReplenishmentPriority(score: number): ReplenishmentPriority {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  if (score >= 20) return "low";
  return "none";
}

export function determineReasons(
  product: StockProduct,
  analysis: Omit<InventoryAnalysis, "reasons" | "replenishmentScore" | "replenishmentPriority">,
): string[] {
  const reasons: string[] = [];

  if (analysis.stockStatus === "inactive") {
    reasons.push("Produto inativo no catálogo.");
    return reasons;
  }

  if (analysis.stockStatus === "out_of_stock") {
    reasons.push("Estoque disponível zerado.");
  }
  if (analysis.stockStatus === "stockout_risk") {
    reasons.push("Estoque projetado ficará negativo durante o prazo de reposição.");
  }
  if (analysis.stockStatus === "low_stock") {
    reasons.push("Estoque disponível abaixo do mínimo.");
  }
  if (analysis.stockCoverageDays !== null && analysis.stockCoverageDays <= CRITICAL_COVERAGE_DAYS) {
    reasons.push(`Cobertura estimada inferior a ${CRITICAL_COVERAGE_DAYS} dias.`);
  }
  if (analysis.stockCoverageDays !== null && analysis.stockCoverageDays <= HIGH_COVERAGE_DAYS && analysis.stockCoverageDays > CRITICAL_COVERAGE_DAYS) {
    reasons.push(`Cobertura estimada abaixo de ${HIGH_COVERAGE_DAYS} dias.`);
  }
  if (analysis.abcClass === "A") {
    reasons.push("Produto classificado como curva A.");
  }
  if (analysis.abcClass === "B") {
    reasons.push("Produto classificado como curva B.");
  }
  if (analysis.suggestedPurchaseQuantity > 0) {
    reasons.push(`Compra sugerida: ${analysis.suggestedPurchaseQuantity} unidades.`);
  }
  if (analysis.stockStatus === "slow_moving") {
    reasons.push("Produto sem vendas há 60 dias ou mais.");
  }
  if (analysis.stockStatus === "overstock") {
    reasons.push("Estoque disponível acima do máximo recomendado.");
  }

  if (reasons.length === 0) {
    reasons.push("Estoque dentro da normalidade.");
  }

  return reasons;
}
