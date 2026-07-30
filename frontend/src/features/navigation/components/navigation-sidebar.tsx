"use client";

import { useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NAV_ITEMS } from "@/features/navigation/config";
import { NavigationItem } from "./navigation-item";
import { SidebarHeader } from "./sidebar-header";
import { SidebarFooter } from "./sidebar-footer";
import { useAuth } from "@/auth/session/auth-provider";

interface NavigationSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function NavigationSidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}: NavigationSidebarProps) {
  const { user } = useAuth();

  const visibleItems = useMemo(() => {
    if (!user) return [];
    return NAV_ITEMS.filter((item) => {
      if (!item.permission) return true;
      return user.permissions.includes(item.permission);
    });
  }, [user]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onMobileClose();
    },
    [onMobileClose],
  );

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen, handleKeyDown]);

  const nav = (
    <nav className="flex-1 space-y-1 py-3 overflow-y-auto px-2" role="navigation" aria-label="Navegação principal">
      {visibleItems.map((item) => (
        <NavigationItem key={item.href} item={item} collapsed={collapsed} />
      ))}
    </nav>
  );

  return (
    <>
      <motion.aside
        animate={{ width: collapsed ? 56 : 224 }}
        transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
        className={cn(
          "hidden md:flex flex-col border-r bg-surface h-screen sticky top-0 overflow-hidden z-30",
        )}
      >
        <div className="flex h-12 items-center justify-between px-3">
          <SidebarHeader collapsed={collapsed} />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggle}
            className={cn("shrink-0", collapsed && "mx-auto")}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            <ChevronLeft
              className={cn(
                "size-4 transition-transform duration-200",
                collapsed && "rotate-180",
              )}
            />
          </Button>
        </div>
        {nav}
        <SidebarFooter collapsed={collapsed} />
      </motion.aside>

      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Menu de navegação">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-black/40"
              onClick={onMobileClose}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
              className="relative w-56 h-screen bg-surface border-r flex flex-col z-50 shadow-lg"
            >
              <div className="flex h-12 items-center justify-between px-3">
                <SidebarHeader collapsed={false} />
                <Button variant="ghost" size="icon-sm" onClick={onMobileClose} aria-label="Fechar menu">
                  <ChevronLeft className="size-4" />
                </Button>
              </div>
              {nav}
              <SidebarFooter collapsed={false} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
