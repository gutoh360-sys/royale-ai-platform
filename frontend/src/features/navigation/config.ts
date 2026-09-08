import {
  LayoutDashboard,
  LineChart,
  Package,
  ShoppingBag,
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
  section?: "main" | "secondary";
}

export const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", permission: Permissions.Dashboard.View, section: "main" },
  { icon: LineChart, label: "Marketplace", href: "/marketplace", permission: Permissions.Marketplace.View, section: "main" },
  { icon: ShoppingBag, label: "Produtos", href: "/products", permission: Permissions.Products.View, section: "main" },
  { icon: Package, label: "Estoque", href: "/inventory", permission: Permissions.Inventory.View, section: "main" },
  { icon: RefreshCw, label: "Integrações", href: "/admin/integrations/bling", section: "main" },
];
