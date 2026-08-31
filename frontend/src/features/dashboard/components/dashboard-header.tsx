"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { AnalyticsPeriodDays } from "@/types/api";

function useGreeting() {
  return useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }, []);
}

function useFormattedDate() {
  return useMemo(
    () =>
      new Intl.DateTimeFormat("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date()),
    [],
  );
}

const periods: { label: string; days: AnalyticsPeriodDays }[] = [
  { label: "Hoje", days: 1 },
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
];

interface PeriodSelectorProps {
  days: AnalyticsPeriodDays;
  onDaysChange?: (days: AnalyticsPeriodDays) => void;
}

function PeriodSelector({ days, onDaysChange }: PeriodSelectorProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border p-0.5">
      {periods.map((period) => (
        <button
          key={period.days}
          onClick={() => onDaysChange?.(period.days)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            days === period.days
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}

interface DashboardHeaderProps {
  days?: AnalyticsPeriodDays;
  onDaysChange?: (days: AnalyticsPeriodDays) => void;
}

export function DashboardHeader({ days = 7, onDaysChange }: DashboardHeaderProps) {
  const greeting = useGreeting();
  const date = useFormattedDate();

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1.5">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {greeting}
        </h1>
        <p className="text-sm text-muted-foreground">
          Royale AI Platform
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
          <p className="text-xs text-muted-foreground capitalize">{date}</p>
        </div>
      </div>
      <PeriodSelector days={days} onDaysChange={onDaysChange} />
    </div>
  );
}
