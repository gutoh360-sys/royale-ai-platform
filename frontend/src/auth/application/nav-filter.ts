import type { Permission } from "@/auth/domain/permissions";

export interface NavItemConfig {
  label: string;
  href: string;
  permission?: Permission;
  disabled?: boolean;
}

export function filterNavByPermission(
  items: NavItemConfig[],
  permissions: string[],
): NavItemConfig[] {
  return items.filter((item) => {
    if (!item.permission) return true;
    return permissions.includes(item.permission);
  });
}
