export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatPercentage(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

export function formatCompactCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1)} mi`;
  }
  if (value >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(0)} mil`;
  }
  return formatCurrency(value);
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    compactDisplay: "short",
  }).format(value);
}
