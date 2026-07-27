"use client";

import { useState, useCallback } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapsed = useCallback(() => setCollapsed((v) => !v), []);
  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <div className="flex h-screen">
      <Sidebar
        collapsed={collapsed}
        onToggle={toggleCollapsed}
        mobileOpen={mobileOpen}
        onMobileClose={closeMobile}
      />
      <div className="flex flex-1 flex-col min-w-0">
        <Header onMenuClick={openMobile} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
