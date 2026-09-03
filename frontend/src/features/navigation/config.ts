import {
  LayoutDashboard,
  LineChart,
  Package,
  Wallet,
  ShoppingBag,
  ShoppingCart,
  Bot,
  BarChart3,
  Settings,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { Permissions } from "@/auth/domain/permissions";
import type { Permission } from "@/auth/domain/permissions";

export interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
  disabled?: boolean;
  permission?: Permission;
}

export const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", permission: Permissions.Dashboard.View },
  { icon: LineChart, label: "Marketplace", href: "/marketplace", permission: Permissions.Marketplace.View },
  { icon: Package, label: "Estoque", href: "/inventory", permission: Permissions.Inventory.View },
  { icon: Wallet, label: "Financeiro", href: "/financial", permission: Permissions.Financial.View },
  { icon: ShoppingBag, label: "Produtos", href: "/products", permission: Permissions.Products.View },
  { icon: ShoppingCart, label: "Compras", href: "/purchasing", permission: Permissions.Purchasing.View },
  { icon: Bot, label: "IA", href: "/ai", disabled: true, permission: Permissions.AI.Access },
  { icon: BarChart3, label: "Relatórios", href: "/reports", disabled: true, permission: Permissions.Reports.View },
  { icon: RefreshCw, label: "Sync Bling", href: "/admin/integrations/bling" },
  { icon: Settings, label: "Configurações", href: "/settings", disabled: true, permission: Permissions.Settings.Manage },
  { icon: LayoutDashboard, label: "Copiloto Executivo", href: "/executive-copilot", permission: Permissions.Copilot.Access },
];
