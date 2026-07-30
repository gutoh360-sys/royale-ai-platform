import { describe, it, expect, beforeEach } from "vitest";
import { findUserByLogin, getStoredHash, logAttempt, isBlocked } from "./users";
import { verifyPassword } from "./password";

beforeEach(() => {
  logAttempt("reset", true);
});

describe("findUserByLogin", () => {
  it("encontra usuário adm", () => {
    const user = findUserByLogin("adm");
    expect(user).not.toBeNull();
    expect(user!.login).toBe("adm");
    expect(user!.name).toBe("Administrador");
    expect(user!.role).toBe("ADMIN");
  });

  it("retorna null para login inexistente", () => {
    expect(findUserByLogin("inexistente")).toBeNull();
  });
});

describe("getStoredHash", () => {
  it("retorna hash para usuário existente", () => {
    const hash = getStoredHash("adm");
    expect(hash).not.toBeNull();
  });

  it("retorna null para usuário inexistente", () => {
    expect(getStoredHash("fake")).toBeNull();
  });

  it("hash de adm pode verificar senha 123", async () => {
    const hash = getStoredHash("adm");
    expect(await verifyPassword("123", hash!)).toBe(true);
  });
});

describe("rate limiting", () => {
  it("isBlocked retorna false inicialmente", () => {
    expect(isBlocked()).toBe(false);
  });

  it("isBlocked retorna true após 5 tentativas", () => {
    for (let i = 0; i < 5; i++) {
      logAttempt("adm", false);
    }
    expect(isBlocked()).toBe(true);
  });
});
