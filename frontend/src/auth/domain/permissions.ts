export const Permissions = {
  Dashboard: {
    View: "dashboard.view",
    Edit: "dashboard.edit",
  },
  Marketplace: {
    View: "marketplace.view",
    Edit: "marketplace.edit",
  },
  Inventory: {
    View: "inventory.view",
    Edit: "inventory.edit",
  },
  Financial: {
    View: "financial.view",
    Edit: "financial.edit",
  },
  Sales: {
    View: "sales.view",
    Edit: "sales.edit",
  },
  Products: {
    View: "products.view",
    Edit: "products.edit",
  },
  Purchasing: {
    View: "purchasing.view",
    Edit: "purchasing.edit",
  },
  Reports: {
    View: "reports.view",
    Export: "reports.export",
  },
  AI: {
    Access: "ai.access",
  },
  Copilot: {
    Access: "copilot.access",
  },
  Users: {
    Manage: "users.manage",
  },
  Settings: {
    Manage: "settings.manage",
  },
} as const;

type ValuesOf<T> = T[keyof T];
type SubValues<T> = ValuesOf<{ [K in keyof T]: ValuesOf<T[K]> }>;

export type Permission = SubValues<typeof Permissions>;
