import { describe, it, expect, beforeEach } from "vitest";
import { saveSession, loadSession, clearSession, getTestStore } from "./session";
import type { Session } from "@/auth/domain/types";

const SESSION_KEY = "royale_session";
const INTEGRITY_KEY = "royale_session_sig";

function makeSession(overrides?: Partial<Session>): Session {
  return {
    userId: "u-1",
    login: "adm",
    name: "Admin",
    role: "ADMIN",
    permissions: ["dashboard.view"],
    expiresAt: Date.now() + 3600000,
    ...overrides,
  };
}

beforeEach(() => {
  clearSession();
});

describe("session integrity", () => {
  it("salva e carrega sessão válida", async () => {
    const session = makeSession();
    await saveSession(session);
    const loaded = await loadSession();
    expect(loaded).not.toBeNull();
    expect(loaded!.login).toBe("adm");
  });

  it("rejeita sessão com dados adulterados", async () => {
    const session = makeSession();
    await saveSession(session);
    const store = getTestStore();
    store.setItem(SESSION_KEY, '{"login":"hacker","role":"ADMIN"}');
    const loaded = await loadSession();
    expect(loaded).toBeNull();
  });

  it("rejeita sessão expirada", async () => {
    const session = makeSession({ expiresAt: Date.now() - 1000 });
    await saveSession(session);
    const loaded = await loadSession();
    expect(loaded).toBeNull();
  });

  it("rejeita sessão sem assinatura", async () => {
    const session = makeSession();
    await saveSession(session);
    const store = getTestStore();
    store.removeItem(INTEGRITY_KEY);
    const loaded = await loadSession();
    expect(loaded).toBeNull();
  });

  it("limpa dados corrompidos ao carregar", async () => {
    const store = getTestStore();
    store.setItem(SESSION_KEY, "invalid-json");
    store.setItem(INTEGRITY_KEY, "abc");
    const loaded = await loadSession();
    expect(loaded).toBeNull();
    expect(store.getItem(SESSION_KEY)).toBeNull();
    expect(store.getItem(INTEGRITY_KEY)).toBeNull();
  });

  it("preserva sessão com assinatura válida", async () => {
    const session = makeSession();
    await saveSession(session);
    const loaded = await loadSession();
    expect(loaded).not.toBeNull();
    expect(loaded!.login).toBe("adm");
    expect(loaded!.role).toBe("ADMIN");
  });
});
