"use client";

import { Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "./breadcrumb";
import { UserMenu } from "./user-menu";

const MOCK_BREADCRUMB = [
  { label: "Dashboard" },
];

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="flex h-12 items-center justify-between gap-4 border-b px-4 bg-surface">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="size-4" />
        </Button>
        <Breadcrumb segments={MOCK_BREADCRUMB} />
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 h-8 text-sm text-muted-foreground">
          <Search className="size-3.5" />
          <span>Buscar...</span>
        </div>
        <UserMenu />
      </div>
    </header>
  );
}
