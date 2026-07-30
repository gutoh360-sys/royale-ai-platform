"use client";

import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/auth/session/auth-provider";

interface SidebarFooterProps {
  collapsed: boolean;
}

export function SidebarFooter({ collapsed }: SidebarFooterProps) {
  const { user, logout } = useAuth();

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "AD";

  return (
    <div className="border-t">
      {collapsed ? (
        <div className="flex flex-col items-center gap-2 py-3">
          <div className="size-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
            {initials}
          </div>
          <button
            onClick={logout}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Sair"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      ) : (
        <div className="p-3 space-y-3">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-full bg-muted shrink-0 flex items-center justify-center text-xs font-medium">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                {user?.name ?? "Administrador"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                Royale Solutions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={logout}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-1",
              )}
            >
              <LogOut className="size-4" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
