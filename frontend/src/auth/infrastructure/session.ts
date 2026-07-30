import type { Session, AuthUser } from "@/auth/domain/types";

const SESSION_KEY = "royale_session";
const INTEGRITY_KEY = "royale_session_sig";

const memoryStore = new Map<string, string>();

function getStorage(): Storage | null {
  if (typeof sessionStorage !== "undefined") {
    try {
      void sessionStorage.length;
      return sessionStorage;
    } catch {
      return null;
    }
  }
  return null;
}

class MemoryStorage implements Storage {
  [key: string]: unknown;
  get length(): number { return memoryStore.size; }
  clear(): void { memoryStore.clear(); }
  getItem(key: string): string | null { return memoryStore.get(key) ?? null; }
  key(index: number): string | null { return [...memoryStore.keys()][index] ?? null; }
  removeItem(key: string): void { memoryStore.delete(key); }
  setItem(key: string, value: string): void { memoryStore.set(key, value); }
}

let _fallback: MemoryStorage | null = null;

function getFallback(): MemoryStorage {
  if (!_fallback) _fallback = new MemoryStorage();
  return _fallback;
}

function getStore(): Storage {
  return getStorage() ?? getFallback();
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode("royale-session-integrity-v1"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function verify(payload: string, signature: string): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode("royale-session-integrity-v1"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const sigBytes = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0));
    return await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(payload));
  } catch {
    return false;
  }
}

export async function saveSession(session: Session): Promise<void> {
  try {
    const payload = JSON.stringify(session);
    const signature = await sign(payload);
    getStore().setItem(SESSION_KEY, payload);
    getStore().setItem(INTEGRITY_KEY, signature);
  } catch {
    return;
  }
}

export async function loadSession(): Promise<Session | null> {
  try {
    const payload = getStore().getItem(SESSION_KEY);
    const signature = getStore().getItem(INTEGRITY_KEY);
    if (!payload || !signature) return null;
    const valid = await verify(payload, signature);
    if (!valid) {
      clearSession();
      return null;
    }
    const session = JSON.parse(payload) as Session;
    if (Date.now() > session.expiresAt) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    clearSession();
    return null;
  }
}

export function clearSession(): void {
  try {
    getStore().removeItem(SESSION_KEY);
    getStore().removeItem(INTEGRITY_KEY);
  } catch {
    return;
  }
}

export function getTestStore(): Storage {
  return getStore();
}

export function sessionToAuthUser(session: Session): AuthUser {
  return {
    id: session.userId,
    login: session.login,
    name: session.name,
    role: session.role,
    permissions: session.permissions,
  };
}
