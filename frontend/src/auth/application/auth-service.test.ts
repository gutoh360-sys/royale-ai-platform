import { describe, it, expect, beforeEach } from "vitest";
import { login, logout, getCurrentSession, setDelayEnabled } from "./auth-service";
import { logAttempt } from "@/auth/infrastructure/users";

beforeEach(() => {
  setDelayEnabled(false);
  logout();
  logAttempt("adm", true);
});

describe("login", () => {
  it("retorna sucesso para login e senha corretos (adm/123)", async () => {
    const result = await login("adm", "123");
    expect(result.success).toBe(true);
  });

  it("retorna erro genérico para senha incorreta", async () => {
    const result = await login("adm", "senha-errada");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Usuário ou senha inválidos.");
  });

  it("retorna erro genérico para usuário inexistente", async () => {
    const result = await login("usuario-x", "123");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Usuário ou senha inválidos.");
  });

  it("retorna erro genérico para login vazio", async () => {
    const result = await login("", "123");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Usuário ou senha inválidos.");
  });

  it("retorna erro genérico para senha vazia", async () => {
    const result = await login("adm", "");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Usuário ou senha inválidos.");
  });

  it("faz trim automático do login", async () => {
    const result = await login("  adm  ", "123");
    expect(result.success).toBe(true);
  });

  it("rejeita login com mais de 100 caracteres", async () => {
    const result = await login("a".repeat(101), "123");
    expect(result.success).toBe(false);
  });

  it("rejeita senha com mais de 128 caracteres", async () => {
    const result = await login("adm", "a".repeat(129));
    expect(result.success).toBe(false);
  });
});

describe("rate limit", () => {
  it("bloqueia após 5 tentativas falhas", async () => {
    for (let i = 0; i < 5; i++) {
      await login("adm", "senha-errada");
    }
    const result = await login("adm", "123");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Usuário ou senha inválidos.");
  });
});

describe("getCurrentSession", () => {
  it("retorna null quando não há sessão", async () => {
    logout();
    expect(await getCurrentSession()).toBeNull();
  });

  it("retorna sessão após login", async () => {
    await login("adm", "123");
    const session = await getCurrentSession();
    expect(session).not.toBeNull();
    expect(session!.login).toBe("adm");
    expect(session!.name).toBe("Administrador");
    expect(session!.role).toBe("ADMIN");
    expect(session!.permissions.length).toBeGreaterThan(0);
    expect(session!.expiresAt).toBeGreaterThan(Date.now());
  });

  it("retorna null após logout", async () => {
    await login("adm", "123");
    logout();
    expect(await getCurrentSession()).toBeNull();
  });
});
