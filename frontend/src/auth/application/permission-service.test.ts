import { describe, it, expect } from "vitest";
import { hasPermission } from "./permission-service";
import { Permissions } from "@/auth/domain/permissions";
import { getPermissionsForRole } from "@/auth/domain/role-permissions";

describe("hasPermission", () => {
  it("retorna true quando usuário possui a permissão", () => {
    const adminPerms = getPermissionsForRole("ADMIN");
    expect(hasPermission(adminPerms, Permissions.Dashboard.View)).toBe(true);
    expect(hasPermission(adminPerms, Permissions.Users.Manage)).toBe(true);
  });

  it("retorna false quando usuário não possui a permissão", () => {
    const viewerPerms = getPermissionsForRole("VIEWER");
    expect(hasPermission(viewerPerms, Permissions.Users.Manage)).toBe(false);
    expect(hasPermission(viewerPerms, Permissions.Copilot.Access)).toBe(false);
  });

  it("retorna false para lista vazia", () => {
    expect(hasPermission([], Permissions.Dashboard.View)).toBe(false);
  });
});
