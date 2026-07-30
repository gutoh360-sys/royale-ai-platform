import { describe, it, expect } from "vitest";
import { getPermissionsForRole } from "./role-permissions";
import { Permissions } from "./permissions";

describe("getPermissionsForRole", () => {
  it("ADMIN possui todas as permissões", () => {
    const all = Object.values(Permissions).flatMap((p) => Object.values(p));
    const adminPerms = getPermissionsForRole("ADMIN");
    expect(adminPerms.sort()).toEqual(all.sort());
  });

  it("VIEWER tem permissões limitadas", () => {
    const viewer = getPermissionsForRole("VIEWER");
    expect(viewer).toContain(Permissions.Dashboard.View);
    expect(viewer).not.toContain(Permissions.Dashboard.Edit);
    expect(viewer).not.toContain(Permissions.Users.Manage);
    expect(viewer).not.toContain(Permissions.Copilot.Access);
  });

  it("MANAGER tem acesso de edição mas não gerencia usuários", () => {
    const manager = getPermissionsForRole("MANAGER");
    expect(manager).toContain(Permissions.Marketplace.Edit);
    expect(manager).not.toContain(Permissions.Users.Manage);
    expect(manager).not.toContain(Permissions.Settings.Manage);
  });

  it("FINANCE tem acesso apenas a financeiro e relatórios", () => {
    const finance = getPermissionsForRole("FINANCE");
    expect(finance).toContain(Permissions.Financial.View);
    expect(finance).toContain(Permissions.Financial.Edit);
    expect(finance).toContain(Permissions.Reports.View);
    expect(finance).toContain(Permissions.Reports.Export);
    expect(finance).not.toContain(Permissions.Inventory.View);
    expect(finance).not.toContain(Permissions.Sales.View);
    expect(finance).not.toContain(Permissions.Users.Manage);
  });

  it("SUPPORT tem acesso a visualização de módulos relevantes", () => {
    const support = getPermissionsForRole("SUPPORT");
    expect(support).toContain(Permissions.Marketplace.View);
    expect(support).toContain(Permissions.Copilot.Access);
    expect(support).not.toContain(Permissions.Inventory.Edit);
    expect(support).not.toContain(Permissions.Financial.View);
  });

  it("retorna array vazio para role inexistente", () => {
    const perms = getPermissionsForRole("INVALID" as unknown as "ADMIN");
    expect(perms).toEqual([]);
  });
});
