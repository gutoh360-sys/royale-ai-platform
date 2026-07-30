import type { Session } from "@/auth/domain/types";
import { findUserByLogin, getStoredHash, logAttempt, isBlocked } from "@/auth/infrastructure/users";
import { verifyPassword } from "@/auth/infrastructure/password";
import { getPermissionsForRole } from "@/auth/domain/role-permissions";
import { saveSession, loadSession, clearSession } from "@/auth/infrastructure/session";

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
const MIN_DELAY_MS = 400;
const MAX_DELAY_MS = 600;

export function setDelayEnabled(enabled: boolean): void {
  delayEnabled = enabled;
}

let delayEnabled = true;

function delay(): Promise<void> {
  if (!delayEnabled) return Promise.resolve();
  const ms = Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) + MIN_DELAY_MS;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function login(loginId: string, password: string): Promise<{ success: boolean; error?: string }> {
  if (isBlocked()) {
    await delay();
    return { success: false, error: "Usuário ou senha inválidos." };
  }

  const trimmedLogin = (loginId ?? "").trim();
  const trimmedPassword = password ?? "";

  if (!trimmedLogin || !trimmedPassword) {
    await delay();
    return { success: false, error: "Usuário ou senha inválidos." };
  }

  if (trimmedLogin.length > 100 || trimmedPassword.length > 128) {
    await delay();
    return { success: false, error: "Usuário ou senha inválidos." };
  }

  const user = findUserByLogin(trimmedLogin);
  const hash = user ? getStoredHash(trimmedLogin) : null;

  let valid = false;
  if (user && hash) {
    valid = await verifyPassword(trimmedPassword, hash);
  }

  logAttempt(trimmedLogin, valid);

  const result = valid
    ? { success: true as const }
    : { success: false as const, error: "Usuário ou senha inválidos." as const };

  if (valid) {
    const permissions = getPermissionsForRole(user!.role);
    const session: Session = {
      userId: user!.id,
      login: user!.login,
      name: user!.name,
      role: user!.role,
      permissions,
      expiresAt: Date.now() + SESSION_DURATION_MS,
    };
    await saveSession(session);
  } else {
    await delay();
  }

  return result;
}

export function logout(): void {
  clearSession();
}

export async function getCurrentSession(): Promise<Session | null> {
  return loadSession();
}
