import type { Role } from "./types";
import { Permissions } from "./permissions";

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  ADMIN: Object.values(Permissions).flatMap((p) => Object.values(p)),

  MANAGER: [
    Permissions.Dashboard.View,
    Permissions.Dashboard.Edit,
    Permissions.Marketplace.View,
    Permissions.Marketplace.Edit,
    Permissions.Inventory.View,
    Permissions.Inventory.Edit,
    Permissions.Financial.View,
    Permissions.Financial.Edit,
    Permissions.Sales.View,
    Permissions.Sales.Edit,
    Permissions.Products.View,
    Permissions.Products.Edit,
    Permissions.Purchasing.View,
    Permissions.Purchasing.Edit,
    Permissions.Reports.View,
    Permissions.Reports.Export,
    Permissions.Copilot.Access,
  ],

  SUPERVISOR: [
    Permissions.Dashboard.View,
    Permissions.Marketplace.View,
    Permissions.Inventory.View,
    Permissions.Inventory.Edit,
    Permissions.Financial.View,
    Permissions.Sales.View,
    Permissions.Sales.Edit,
    Permissions.Products.View,
    Permissions.Purchasing.View,
    Permissions.Reports.View,
    Permissions.Copilot.Access,
  ],

  FINANCE: [
    Permissions.Dashboard.View,
    Permissions.Financial.View,
    Permissions.Financial.Edit,
    Permissions.Reports.View,
    Permissions.Reports.Export,
  ],

  SUPPORT: [
    Permissions.Dashboard.View,
    Permissions.Marketplace.View,
    Permissions.Sales.View,
    Permissions.Inventory.View,
    Permissions.Copilot.Access,
  ],

  VIEWER: [
    Permissions.Dashboard.View,
    Permissions.Marketplace.View,
    Permissions.Inventory.View,
    Permissions.Financial.View,
    Permissions.Sales.View,
    Permissions.Products.View,
    Permissions.Purchasing.View,
  ],
};

export function getPermissionsForRole(role: Role): string[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
