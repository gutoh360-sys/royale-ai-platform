"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "./user-menu";

const PAGE_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/marketplace": "Marketplace",
  "/inventory": "Estoque",
  "/financial": "Financeiro",
  "/products": "Produtos",
  "/ai": "IA",
  "/reports": "Relatórios",
  "/settings": "Configurações",
  "/copilot": "Copiloto Executivo",
  "/executive-copilot": "Copiloto Executivo",
  "/playground": "Playground",
  "/app": "App",
};

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const label = PAGE_LABELS[pathname] ?? (pathname.replace("/", "").replace(/-/g, " ") || "Dashboard");

  return (
    <header className="flex h-12 items-center justify-between gap-4 border-b bg-surface px-4">
      <div className="flex items-center gap-3 min-w-0">
        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          onClick={onMenuClick}
          aria-label="Abrir menu"
        >
          <Menu className="size-4" />
        </Button>
        <h1 className="truncate text-sm font-medium text-foreground">{label}</h1>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <UserMenu />
      </div>
    </header>
  );
}
