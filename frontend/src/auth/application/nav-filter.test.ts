import { describe, it, expect } from "vitest";
import { filterNavByPermission } from "./nav-filter";
import { Permissions } from "@/auth/domain/permissions";

describe("filterNavByPermission", () => {
  const items = [
    { label: "Dashboard", href: "/dashboard", permission: Permissions.Dashboard.View },
    { label: "Users", href: "/users", permission: Permissions.Users.Manage },
    { label: "Settings", href: "/settings", permission: Permissions.Settings.Manage },
    { label: "Always Visible", href: "/always" },
  ];

  it("filtra itens com base nas permissões do usuário", () => {
    const perms = [Permissions.Dashboard.View, Permissions.Settings.Manage];
    const result = filterNavByPermission(items, perms);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.label)).toEqual(["Dashboard", "Settings", "Always Visible"]);
  });

  it("exibe itens sem permissão definida para todos", () => {
    const result = filterNavByPermission(items, []);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("Always Visible");
  });

  it("retorna lista vazia se nenhum item corresponde", () => {
    const result = filterNavByPermission(items, []);
    expect(result).toHaveLength(1);
  });
});
