import { TrendingUp, ShoppingCart, Receipt, Percent } from "lucide-react";
import type { ExecutiveMetric } from "@/features/dashboard/executive-summary/types";

export const mockExecutiveMetrics: ExecutiveMetric[] = [
  {
    id: "revenue",
    label: "Receita",
    value: 284750.0,
    formattedValue: "R$ 284,7 mil",
    variation: 12.5,
    trend: "up",
    comparisonLabel: "vs. período anterior",
    icon: TrendingUp,
  },
  {
    id: "orders",
    label: "Pedidos",
    value: 1843,
    formattedValue: "1.843",
    variation: 8.2,
    trend: "up",
    comparisonLabel: "vs. período anterior",
    icon: ShoppingCart,
  },
  {
    id: "avgTicket",
    label: "Ticket médio",
    value: 154.5,
    formattedValue: "R$ 154,50",
    variation: 3.1,
    trend: "up",
    comparisonLabel: "vs. período anterior",
    icon: Receipt,
  },
  {
    id: "margin",
    label: "Margem estimada",
    value: 38.4,
    formattedValue: "38,4%",
    variation: -2.1,
    trend: "down",
    comparisonLabel: "vs. período anterior",
    icon: Percent,
  },
];

export const mockEmptyMetrics: ExecutiveMetric[] = [];

export const mockLoadingState = { isLoading: true };
export const mockErrorState = { error: "Erro ao carregar métricas" };
