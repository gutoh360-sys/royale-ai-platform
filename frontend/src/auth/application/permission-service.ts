import type { Permission } from "@/auth/domain/permissions";

export function hasPermission(userPermissions: string[], permission: Permission): boolean {
  return userPermissions.includes(permission);
}

export function requirePermission(userPermissions: string[], permission: Permission): void {
  if (!hasPermission(userPermissions, permission)) {
    throw new Error("Forbidden");
  }
}

export function filterPermissions(
  userPermissions: string[],
  items: { permission?: Permission }[],
): { permission?: Permission }[] {
  return items.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(userPermissions, item.permission);
  });
}
