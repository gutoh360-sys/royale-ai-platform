"use client";

import { useAuth } from "@/auth/session/auth-provider";
import type { Permission } from "@/auth/domain/permissions";
import { hasPermission } from "@/auth/application/permission-service";
import { AccessDenied } from "@/auth/components/access-denied";

export function RequirePermission({
  permission,
  children,
  fallback,
}: {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { user } = useAuth();
  if (!user) return null;
  if (!hasPermission(user.permissions, permission)) {
    return fallback ?? <AccessDenied />;
  }
  return <>{children}</>;
}
