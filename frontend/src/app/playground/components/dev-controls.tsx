"use client";

import { cn } from "@/lib/utils";
import type { DashboardDataStatus } from "@/features/dashboard/data/types";

interface DevControlsProps {
  mode: DashboardDataStatus;
  onChange: (mode: DashboardDataStatus) => void;
}

const modes: { value: DashboardDataStatus; label: string }[] = [
  { value: "success", label: "Success" },
  { value: "loading", label: "Loading" },
  { value: "empty", label: "Empty" },
  { value: "error", label: "Error" },
];

export function DevControls({ mode, onChange }: DevControlsProps) {
  return (
    <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Developer Controls
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-0.5">
          {modes.map((m) => (
            <button
              key={m.value}
              onClick={() => onChange(m.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                mode === m.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
