"use client";

import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  Puzzle,
  Settings,
  ChevronLeft,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { Button } from "@/components/ui/button";

interface SidebarItemData {
  icon: LucideIcon;
  label: string;
  active?: boolean;
}

interface SidebarSectionData {
  title: string;
  items: SidebarItemData[];
}

const NAV_SECTIONS: SidebarSectionData[] = [
  {
    title: "Principal",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", active: true },
      { icon: Package, label: "Produtos" },
      { icon: ShoppingCart, label: "Pedidos" },
      { icon: Users, label: "Clientes" },
      { icon: BarChart3, label: "Relatórios" },
    ],
  },
  {
    title: "Administração",
    items: [
      { icon: Puzzle, label: "Integrações" },
      { icon: Settings, label: "Configurações" },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

function SidebarItem({
  item,
  collapsed,
}: {
  item: SidebarItemData;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  return (
    <button
      className={cn(
        "group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
        item.active
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </button>
  );
}

function SidebarSection({
  section,
  collapsed,
}: {
  section: SidebarSectionData;
  collapsed: boolean;
}) {
  return (
    <div className="px-2">
      {!collapsed && (
        <p className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
          {section.title}
        </p>
      )}
      <div className="flex flex-col gap-0.5">
        {section.items.map((item) => (
          <SidebarItem key={item.label} item={item} collapsed={collapsed} />
        ))}
      </div>
    </div>
  );
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  return (
    <>
      <motion.aside
        animate={{ width: collapsed ? 56 : 224 }}
        transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
        className={cn(
          "hidden lg:flex flex-col border-r bg-surface h-screen sticky top-0 overflow-hidden z-30",
        )}
      >
        <div className="flex h-12 items-center justify-between px-3">
          <Logo collapsed={collapsed} />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggle}
            className={cn("shrink-0", collapsed && "mx-auto")}
          >
            <ChevronLeft
              className={cn(
                "size-4 transition-transform",
                collapsed && "rotate-180",
              )}
            />
          </Button>
        </div>

        <nav className="flex-1 space-y-4 py-3 overflow-y-auto">
          {NAV_SECTIONS.map((section) => (
            <SidebarSection
              key={section.title}
              section={section}
              collapsed={collapsed}
            />
          ))}
        </nav>

        <div className="border-t p-3">
          {collapsed ? (
            <div className="flex justify-center">
              <div className="size-7 rounded-full bg-muted" />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-full bg-muted shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">Admin</p>
                <p className="text-xs text-muted-foreground truncate">
                  admin@royale.ai
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={onMobileClose}
          />
          <motion.aside
            initial={{ x: -256 }}
            animate={{ x: 0 }}
            exit={{ x: -256 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-56 h-screen bg-surface border-r flex flex-col z-50"
          >
            <div className="flex h-12 items-center justify-between px-3">
              <Logo />
              <Button variant="ghost" size="icon-sm" onClick={onMobileClose}>
                <ChevronLeft className="size-4" />
              </Button>
            </div>
            <nav className="flex-1 space-y-4 py-3 overflow-y-auto">
              {NAV_SECTIONS.map((section) => (
                <SidebarSection
                  key={section.title}
                  section={section}
                  collapsed={false}
                />
              ))}
            </nav>
            <div className="border-t p-3">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-full bg-muted shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">Admin</p>
                  <p className="text-xs text-muted-foreground truncate">
                    admin@royale.ai
                  </p>
                </div>
              </div>
            </div>
          </motion.aside>
        </div>
      )}
    </>
  );
}
