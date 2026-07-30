"use client";

import { useMemo } from "react";

const VERSION = "0.9.2";

function useFormattedTimestamp() {
  return useMemo(() => {
    const now = new Date();
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(now);
  }, []);
}

export function DashboardFooter() {
  const timestamp = useFormattedTimestamp();

  return (
    <footer className="border-t border-border/50 pt-4 mt-2">
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-muted-foreground">
        <span>Royale AI Platform v{VERSION}</span>
        <span>Última atualização: {timestamp}</span>
        <span>Build: {VERSION.replace(/\./g, "")}-{timestamp.replace(/\D/g, "").slice(0, 8)}</span>
      </div>
    </footer>
  );
}
