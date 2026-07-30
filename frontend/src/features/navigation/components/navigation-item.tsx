"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { NavItem } from "@/features/navigation/config";

interface NavigationItemProps {
  item: NavItem;
  collapsed: boolean;
}

export function NavigationItem({ item, collapsed }: NavigationItemProps) {
  const pathname = usePathname();
  const isActive = pathname === item.href;

  return (
    <Link
      href={item.disabled ? "#" : item.href}
      aria-current={isActive ? "page" : undefined}
      aria-disabled={item.disabled}
      tabIndex={item.disabled ? -1 : 0}
      className={cn(
        "group relative flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isActive
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        item.disabled && "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-primary" aria-hidden="true" />
      )}
      <item.icon className="size-4 shrink-0" />
      {!collapsed && (
        <span className="flex-1 truncate">{item.label}</span>
      )}
      {!collapsed && item.disabled && (
        <Badge
          variant="outline"
          className="text-[9px] px-1 py-0 h-auto font-normal text-muted-foreground/60 border-muted-foreground/20"
        >
          Em breve
        </Badge>
      )}
    </Link>
  );
}
