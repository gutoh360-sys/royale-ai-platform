# Task 1: Reorganize Navigation

**Files:**
- Modify: `frontend/src/features/navigation/config.ts`
- Modify: `frontend/src/features/navigation/components/navigation-sidebar.tsx`

**Goal:** Prioritize 5 working features, hide incomplete ones. Sidebar shows exactly: Dashboard, Marketplace, Produtos, Estoque, Integrações.

- [ ] **Step 1: Rewrite navigation config**

Replace `frontend/src/features/navigation/config.ts` with:

```tsx
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
```

- [ ] **Step 2: Update navigation sidebar to render only main items**

Read `frontend/src/features/navigation/components/navigation-sidebar.tsx`. The sidebar currently imports `NAV_ITEMS` and renders all items. Update it to:
1. Filter `NAV_ITEMS` by `section === "main"` (or just render all since config only has main items now)
2. Remove permission filtering for nav display (keep it for access control only if needed elsewhere)

The sidebar should show exactly 5 items.

- [ ] **Step 3: Run tests**

```bash
cd frontend && npx vitest run
```
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/navigation/
git commit -m "refactor(nav): simplify sidebar to 5 working features"
```
