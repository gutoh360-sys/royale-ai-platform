export type Period = "today" | "7d" | "30d" | "90d" | "12m";

export const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
  { value: "12m", label: "12 meses" },
];

const VALID_PERIODS = new Set<string>(PERIOD_OPTIONS.map((o) => o.value));

export function parsePeriod(value: string | null | undefined): Period {
  if (value && VALID_PERIODS.has(value)) return value as Period;
  return "30d";
}

export function periodToDays(period: Period): number {
  switch (period) {
    case "today": return 1;
    case "7d": return 7;
    case "30d": return 30;
    case "90d": return 90;
    case "12m": return 365;
  }
}

export function formatPeriodLabel(period: Period): string {
  return PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? period;
}
