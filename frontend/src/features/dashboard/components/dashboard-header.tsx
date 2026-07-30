"use client";

import { useState, useMemo } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

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

const periods = ["Hoje", "7 dias", "30 dias"] as const;

function PeriodSelector() {
  const [active, setActive] = useState<(typeof periods)[number]>("7 dias");

  return (
    <div className="flex items-center gap-1 rounded-lg border p-0.5">
      {periods.map((period) => (
        <button
          key={period}
          onClick={() => setActive(period)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            active === period
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {period}
        </button>
      ))}
    </div>
  );
}

export function DashboardHeader() {
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
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3" aria-hidden="true" />
            <span>Última sincronização: Há 2 minutos</span>
          </div>
        </div>
      </div>
      <PeriodSelector />
    </div>
  );
}
