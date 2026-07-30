import type { User, Role } from "@/auth/domain/types";

interface StoredUser {
  id: string;
  login: string;
  name: string;
  role: Role;
  passwordHash: string;
}

const USERS: StoredUser[] = [
  {
    id: "u-admin-001",
    login: "adm",
    name: "Administrador",
    role: "ADMIN",
    passwordHash: "salt:a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6:iterations:100000:hash:1c84684b1fa8d31d4321684871b66b7599eed9222556d2c6261ff1bdde02610ee003270165f812bc9ee621c51dd2d6c914723e767c4791287ae2a185a852dd88",
  },
];

const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 60 * 1000;
const RESET_INTERVAL_MS = 15 * 60 * 1000;

let attempts: { count: number; firstAttempt: number; blockedUntil: number } = {
  count: 0,
  firstAttempt: 0,
  blockedUntil: 0,
};

export function logAttempt(_login: string, success: boolean): void {
  if (success) {
    attempts = { count: 0, firstAttempt: 0, blockedUntil: 0 };
    return;
  }
  const now = Date.now();
  if (now - attempts.firstAttempt > RESET_INTERVAL_MS) {
    attempts = { count: 0, firstAttempt: now, blockedUntil: 0 };
  }
  if (attempts.count === 0) {
    attempts.firstAttempt = now;
  }
  attempts.count++;
  if (attempts.count >= MAX_ATTEMPTS) {
    attempts.blockedUntil = now + BLOCK_DURATION_MS;
  }
}

export function isBlocked(): boolean {
  if (attempts.blockedUntil === 0) return false;
  if (Date.now() < attempts.blockedUntil) return true;
  attempts = { count: 0, firstAttempt: 0, blockedUntil: 0 };
  return false;
}

export function findUserByLogin(login: string): User | null {
  const found = USERS.find((u) => u.login === login);
  if (!found) return null;
  return { id: found.id, login: found.login, name: found.name, role: found.role };
}

export function getStoredHash(login: string): string | null {
  const found = USERS.find((u) => u.login === login);
  return found?.passwordHash ?? null;
}
