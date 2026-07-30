import type { MarketplaceHealth } from "@/features/marketplace/types";

export function getHealthConfig(score: number): {
  level: MarketplaceHealth;
  label: string;
  color: string;
  barColor: string;
} {
  if (score >= 90) {
    return { level: "excellent", label: "Excelente", color: "text-success", barColor: "bg-success" };
  }
  if (score >= 70) {
    return { level: "good", label: "Bom", color: "text-info", barColor: "bg-info" };
  }
  if (score >= 50) {
    return { level: "attention", label: "Atenção", color: "text-warning", barColor: "bg-warning" };
  }
  return { level: "critical", label: "Crítico", color: "text-destructive", barColor: "bg-destructive" };
}
