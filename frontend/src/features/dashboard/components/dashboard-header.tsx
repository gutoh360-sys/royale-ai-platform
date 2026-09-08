"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { PERIOD_OPTIONS, type Period } from "@/lib/period";

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

interface PeriodSelectorProps {
  period: Period;
  onPeriodChange?: (period: Period) => void;
}

function PeriodSelector({ period, onPeriodChange }: PeriodSelectorProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border p-0.5">
      {PERIOD_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onPeriodChange?.(opt.value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            period === opt.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

interface DashboardHeaderProps {
  period?: Period;
  onPeriodChange?: (period: Period) => void;
}

export function DashboardHeader({ period = "7d", onPeriodChange }: DashboardHeaderProps) {
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
      <PeriodSelector period={period} onPeriodChange={onPeriodChange} />
    </div>
  );
}
