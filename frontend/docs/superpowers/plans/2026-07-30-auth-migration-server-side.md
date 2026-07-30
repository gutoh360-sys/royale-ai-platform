# Auth Migration Server-Side Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development to implement this plan task-by-task.

**Goal:** Migrate all authentication from client-side (sessionStorage + HMAC) to server-side (HttpOnly cookies + Server Actions + Proxy middleware)

**Architecture:** Remove `output: "export"` → Create `src/lib/auth/` server-only layer (UserRepository, PasswordService, SessionService) → Server Actions for login/logout → API route for session → Proxy.ts for route protection → AuthProvider fetches from server. Zero business logic changes. Zero changes to executive modules.

**Tech Stack:** Next.js 16.2.12 (canary), Web Crypto API (server-side), Zod, server-only

## Global Constraints

- `output: "export"` must be removed from next.config.ts
- proxy.ts (was middleware.ts) must protect ALL private routes server-side
- HttpOnly cookies for session (Secure, SameSite=Lax, Path=/, httpOnly)
- `server-only` package for all server auth modules
- Environment variables: APP_SECRET, SESSION_SECRET (fail on startup if missing)
- No secrets/hashes in client bundle
- No business logic changes
- No changes to executive modules
- Existing 663+ tests must still pass (some old auth tests may be removed)
- Version: 1.1.1 → 1.2.0
- CSP headers via next.config.ts async headers()

---
## File Structure

```
src/lib/auth/
├── config.ts              — Environment variables loader (APP_SECRET, SESSION_SECRET)
├── user-repository.ts     — User storage (server-only, prepared for DB migration)
├── password-service.ts    — PBKDF2 hash/verify (server-only)
├── session-service.ts     — Session create/validate/destroy (server-only)
├── audit-log.ts           — Security event logging (server-only)
├── auth-service.ts        — Login/logout orchestrator (server-only)
├── actions.ts             — Server Actions (login, logout)
├── password-service.test.ts
├── session-service.test.ts
├── auth-service.test.ts
├── user-repository.test.ts

src/app/api/auth/
└── session/route.ts       — GET: returns current user from session cookie

proxy.ts                   — Route protection (was middleware.ts)

src/auth/
├── session/
│   └── auth-provider.tsx   — MODIFIED: fetches from server instead of local
├── infrastructure/
│   ├── password.ts         — UNCHANGED (still works, just unused by new flow)
│   ├── session.ts          — UNCHANGED (still works, just unused by new flow)
│   └── users.ts            — UNCHANGED (still works, just unused by new flow)

.env.local.example          — Template for env vars
next.config.ts              — MODIFIED: remove output: export, add headers/CSP
package.json               — MODIFIED: version 1.2.0, remove deploy:netlify script
```

### Task Dependencies

```
Task 3 (config.ts) → Task 4 (password-service) 
                  → Task 5 (session-service)
                  → Task 6 (auth-service, actions, API routes)
                  → Task 7 (proxy.ts)
                  → Task 8 (next.config.ts, env)
                  → Task 9 (auth-provider cleanup)
                  → Task 10 (audit-log)
                  → Task 11 (security)
                  → Task 12 (force password change)
                  → Task 13 (tests)
                  → Task 14 (build/verify)
```

### Task 1: Create src/lib/auth/config.ts

**Files:**
- Create: `src/lib/auth/config.ts`

**Interfaces:**
- Produces: `getAppSecret(): string`, `getSessionSecret(): string`, `validateEnv(): void`

- [ ] **Step 1: Create config.ts**

```ts
// src/lib/auth/config.ts
// server-only — never import in client components

let appSecret: string | null = null;
let sessionSecret: string | null = null;

export function validateEnv(): void {
  const errors: string[] = [];

  appSecret = process.env.APP_SECRET ?? null;
  if (!appSecret || appSecret.length < 32) {
    errors.push("APP_SECRET must be set and at least 32 characters");
  }

  sessionSecret = process.env.SESSION_SECRET ?? null;
  if (!sessionSecret || sessionSecret.length < 32) {
    errors.push("SESSION_SECRET must be set and at least 32 characters");
  }

  if (errors.length > 0) {
    throw new Error(`Auth configuration errors:\n${errors.join("\n")}`);
  }
}

export function getAppSecret(): string {
  if (!appSecret) throw new Error("APP_SECRET not configured. Call validateEnv() first.");
  return appSecret;
}

export function getSessionSecret(): string {
  if (!sessionSecret) throw new Error("SESSION_SECRET not configured. Call validateEnv() first.");
  return sessionSecret;
}
```

### Task 2: Create User Repository

**Files:**
- Create: `src/lib/auth/user-repository.ts`

**Interfaces:**
- Consumes: `User` type from `src/auth/domain/types.ts`
- Produces: `findByLogin(login: string): Promise<User | null>`, `getPasswordHash(login: string): Promise<string | null>`, `updatePassword(login: string, newHash: string): Promise<void>`, `mustChangePassword(login: string): Promise<boolean>`, `markPasswordChanged(login: string): Promise<void>`

- [ ] **Step 1: Create user-repository.ts**

```ts
// src/lib/auth/user-repository.ts
import "server-only";
import type { User } from "@/auth/domain/types";

interface StoredUser {
  id: string;
  login: string;
  name: string;
  role: "ADMIN" | "MANAGER" | "SUPERVISOR" | "FINANCE" | "SUPPORT" | "VIEWER";
  passwordHash: string;
  mustChangePassword: boolean;
}

const USERS: StoredUser[] = [
  {
    id: "u-admin-001",
    login: "adm",
    name: "Administrador",
    role: "ADMIN",
    passwordHash: "salt:a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6:iterations:100000:hash:1c84684b1fa8d31d4321684871b66b7599eed9222556d2c6261ff1bdde02610ee003270165f812bc9ee621c51dd2d6c914723e767c4791287ae2a185a852dd88",
    mustChangePassword: true,
  },
];

export interface UserRepository {
  findByLogin(login: string): Promise<User | null>;
  getPasswordHash(login: string): Promise<string | null>;
  mustChangePassword(login: string): Promise<boolean>;
  markPasswordChanged(login: string): Promise<void>;
  updatePassword(login: string, newHash: string): Promise<void>;
}

export function createUserRepository(): UserRepository {
  // In-memory implementation — swap for SQL/LDAP adapter later
  const users: StoredUser[] = JSON.parse(JSON.stringify(USERS));

  return {
    async findByLogin(login: string): Promise<User | null> {
      const found = users.find((u) => u.login === login);
      if (!found) return null;
      return { id: found.id, login: found.login, name: found.name, role: found.role };
    },

    async getPasswordHash(login: string): Promise<string | null> {
      const found = users.find((u) => u.login === login);
      return found?.passwordHash ?? null;
    },

    async mustChangePassword(login: string): Promise<boolean> {
      const found = users.find((u) => u.login === login);
      return found?.mustChangePassword ?? false;
    },

    async markPasswordChanged(login: string): Promise<void> {
      const found = users.find((u) => u.login === login);
      if (found) found.mustChangePassword = false;
    },

    async updatePassword(login: string, newHash: string): Promise<void> {
      const found = users.find((u) => u.login === login);
      if (found) found.passwordHash = newHash;
    },
  };
}

export const userRepository = createUserRepository();
```

### Task 3: Create Password Service

**Files:**
- Create: `src/lib/auth/password-service.ts`

**Interfaces:**
- Produces: `hashPassword(password: string): Promise<string>`, `verifyPassword(password: string, stored: string): Promise<boolean>`

- [ ] **Step 1: Create password-service.ts**

```ts
// src/lib/auth/password-service.ts
import "server-only";

const ITERATIONS = 100_000;
const KEY_LENGTH = 512;

function encode(str: string): ArrayBuffer {
  return new TextEncoder().encode(str).buffer as ArrayBuffer;
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    let result = 0;
    for (let i = 0; i < b.length; i++) result |= 0xff;
    return result === 0;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = toHex(saltBytes.buffer as ArrayBuffer);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encode(password) as BufferSource,
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encode(saltHex) as BufferSource,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    KEY_LENGTH,
  );
  return `salt:${saltHex}:iterations:${ITERATIONS}:hash:${toHex(derived)}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split(":");
  if (
    parts.length !== 6 ||
    parts[0] !== "salt" ||
    parts[2] !== "iterations" ||
    parts[4] !== "hash"
  ) {
    return false;
  }
  const saltHex = parts[1];
  const iterations = parseInt(parts[3], 10);
  const originalHash = parts[5];
  if (!saltHex || isNaN(iterations) || !originalHash || iterations < 1 || iterations > 1_000_000) {
    return false;
  }
  try {
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encode(password) as BufferSource,
      { name: "PBKDF2" },
      false,
      ["deriveBits"],
    );
    const derived = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: encode(saltHex) as BufferSource,
        iterations,
        hash: "SHA-256",
      },
      keyMaterial,
      KEY_LENGTH,
    );
    return timingSafeEqual(toHex(derived), originalHash);
  } catch {
    return false;
  }
}
```

### Task 4: Create Session Service

**Files:**
- Create: `src/lib/auth/session-service.ts`

**Interfaces:**
- Consumes: `Session` type from `@/auth/domain/types`, `getSessionSecret()` from config
- Produces: `createSession(user: User, permissions: string[]): Promise<string>` (returns session token), `validateSession(token: string): Promise<Session | null>`, `destroySession(token: string): Promise<void>`

- [ ] **Step 1: Create session-service.ts**

```ts
// src/lib/auth/session-service.ts
import "server-only";
import { cookies } from "next/headers";
import type { Session, User } from "@/auth/domain/types";
import { getPermissionsForRole } from "@/auth/domain/role-permissions";
import { getSessionSecret } from "./config";

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
const SESSION_COOKIE_NAME = "royale_session";

const sessionStore = new Map<string, { session: Session; expiresAt: number }>();

async function generateToken(userId: string): Promise<string> {
  const secret = getSessionSecret();
  const data = `${userId}:${Date.now()}:${crypto.randomUUID()}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const sigHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${Buffer.from(data).toString("base64url")}.${sigHex}`;
}

export async function createSession(user: User): Promise<string> {
  const permissions = getPermissionsForRole(user.role);
  const session: Session = {
    userId: user.id,
    login: user.login,
    name: user.name,
    role: user.role,
    permissions,
    expiresAt: Date.now() + SESSION_DURATION_MS,
  };
  const token = await generateToken(user.id);
  sessionStore.set(token, { session, expiresAt: session.expiresAt });
  return token;
}

export async function validateSession(token: string): Promise<Session | null> {
  const stored = sessionStore.get(token);
  if (!stored) return null;
  if (Date.now() > stored.expiresAt) {
    sessionStore.delete(token);
    return null;
  }
  return stored.session;
}

export async function destroySession(token: string): Promise<void> {
  sessionStore.delete(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSessionFromCookie(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME);
  if (!token) return null;
  return validateSession(token.value);
}

export async function rotateSession(oldToken: string, user: User): Promise<string> {
  await destroySession(oldToken);
  return createSession(user);
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}
```

### Task 5: Create Server Actions + API Route

**Files:**
- Create: `src/lib/auth/actions.ts`
- Create: `src/app/api/auth/session/route.ts`

**Interfaces:**
- Produces: `loginAction(loginId: string, password: string): Promise<{ success: boolean; error?: string; mustChangePassword?: boolean }>`, `logoutAction(): Promise<void>`
- Produces: `GET /api/auth/session` → `{ user: AuthUser } | { user: null }`

- [ ] **Step 1: Create actions.ts**

```ts
// src/lib/auth/actions.ts
"use server";

import { userRepository } from "./user-repository";
import { verifyPassword, hashPassword } from "./password-service";
import {
  createSession,
  setSessionCookie,
  clearSessionCookie,
  getSessionFromCookie,
  destroySession,
} from "./session-service";
import { auditLog } from "./audit-log";

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
const MIN_DELAY_MS = 400;
const MAX_DELAY_MS = 600;

const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 60 * 1000;
const RESET_INTERVAL_MS = 15 * 60 * 1000;

let delayEnabled = true;
export function setDelayEnabled(enabled: boolean): void {
  delayEnabled = enabled;
}

let attempts: { count: number; firstAttempt: number; blockedUntil: number } = {
  count: 0,
  firstAttempt: 0,
  blockedUntil: 0,
};

function delay(): Promise<void> {
  if (!delayEnabled) return Promise.resolve();
  const ms = Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) + MIN_DELAY_MS;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isBlocked(): boolean {
  if (attempts.blockedUntil === 0) return false;
  if (Date.now() < attempts.blockedUntil) return true;
  attempts = { count: 0, firstAttempt: 0, blockedUntil: 0 };
  return false;
}

function logAttempt(valid: boolean): void {
  if (valid) {
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
    auditLog("RATE_LIMIT_TRIGGERED", { attempts: attempts.count });
  }
}

export async function loginAction(
  loginId: string,
  password: string,
): Promise<{ success: boolean; error?: string; mustChangePassword?: boolean }> {
  const ip = "server-action"; // placeholder for X-Forwarded-For

  if (isBlocked()) {
    await delay();
    auditLog("LOGIN_BLOCKED", { login: loginId, ip });
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

  const user = await userRepository.findByLogin(trimmedLogin);
  const hash = user ? await userRepository.getPasswordHash(trimmedLogin) : null;

  let valid = false;
  if (user && hash) {
    valid = await verifyPassword(trimmedPassword, hash);
  }

  logAttempt(valid);

  if (valid && user) {
    // Check if password change is required
    const mustChange = await userRepository.mustChangePassword(user.login);

    if (mustChange) {
      // Allow login but flag for password change
      const token = await createSession(user);
      await setSessionCookie(token);
      auditLog("LOGIN_SUCCESS_REQUIRES_CHANGE", { login: user.login, ip });
      return { success: true, mustChangePassword: true };
    }

    const token = await createSession(user);
    await setSessionCookie(token);
    auditLog("LOGIN_SUCCESS", { login: user.login, ip });
    return { success: true };
  }

  await delay();
  auditLog("LOGIN_FAILURE", { login: trimmedLogin, ip });
  return { success: false, error: "Usuário ou senha inválidos." };
}

export async function logoutAction(): Promise<void> {
  const session = await getSessionFromCookie();
  if (session) {
    auditLog("LOGOUT", { login: session.login });
  }
  await clearSessionCookie();
}

export async function changePasswordAction(
  currentPassword: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await getSessionFromCookie();
  if (!session) return { success: false, error: "Não autenticado." };

  if (newPassword.length < 8 || newPassword.length > 128) {
    return { success: false, error: "Nova senha deve ter entre 8 e 128 caracteres." };
  }

  const hash = await userRepository.getPasswordHash(session.login);
  if (!hash) return { success: false, error: "Usuário não encontrado." };

  const valid = await verifyPassword(currentPassword, hash);
  if (!valid) return { success: false, error: "Senha atual incorreta." };

  const newHash = await hashPassword(newPassword);
  await userRepository.updatePassword(session.login, newHash);
  await userRepository.markPasswordChanged(session.login);
  auditLog("PASSWORD_CHANGED", { login: session.login });
  return { success: true };
}

export async function getSessionAction(): Promise<{ user: { id: string; login: string; name: string; role: string; permissions: string[] } | null }> {
  const session = await getSessionFromCookie();
  if (!session) return { user: null };
  return {
    user: {
      id: session.userId,
      login: session.login,
      name: session.name,
      role: session.role,
      permissions: session.permissions,
    },
  };
}
```

- [ ] **Step 2: Create API route**

```ts
// src/app/api/auth/session/route.ts
import { getSessionFromCookie } from "@/lib/auth/session-service";

export async function GET(): Promise<Response> {
  const session = await getSessionFromCookie();
  if (!session) {
    return Response.json({ user: null });
  }
  return Response.json({
    user: {
      id: session.userId,
      login: session.login,
      name: session.name,
      role: session.role,
      permissions: session.permissions,
    },
  });
}
```

### Task 6: Create Proxy (Middleware)

**Files:**
- Create: `proxy.ts`

**Interfaces:**
- Produces: route protection for all private routes

- [ ] **Step 1: Create proxy.ts**

```ts
// proxy.ts (was middleware.ts in Next.js 15)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/_not-found", "/api/auth/session"];
const STATIC_ASSETS = /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot)$/;

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Allow static assets and public routes
  if (STATIC_ASSETS.test(pathname) || PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Allow root, access-denied, and playground (which uses AppShell/RequireAuth)
  // The proxy provides server-level check; RequireAuth provides client-level check
  if (pathname === "/" || pathname === "/access-denied") {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionCookie = request.cookies.get("royale_session");
  
  // No session → redirect to /login
  if (!sessionCookie?.value) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand).*)"],
};
```

### Task 7: Configuration Changes

**Files:**
- Modify: `next.config.ts`
- Modify: `package.json`
- Modify: `scripts/deploy-netlify.mjs` (or remove)

- [ ] **Step 1: Update next.config.ts**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js needs unsafe-eval/inline for dev
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "connect-src 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 2: Update package.json version**

```json
"version": "1.2.0"
```

### Task 8: Migrate AuthProvider to Server

**Files:**
- Modify: `src/auth/session/auth-provider.tsx`

- [ ] **Step 1: Update auth-provider.tsx**

```tsx
"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@/auth/domain/types";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (loginId: string, password: string) => Promise<{ success: boolean; error?: string; mustChangePassword?: boolean }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  login: async () => ({ success: false }),
  logout: async () => {},
});

async function fetchSession(): Promise<AuthUser | null> {
  try {
    const res = await fetch("/api/auth/session");
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.user) return null;
    return data.user as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const u = await fetchSession();
      if (!cancelled) {
        setUser(u);
        setIsLoading(false);
      }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (loginId: string, password: string) => {
    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: loginId, password }),
      });
      const result = await res.json();
      if (result.success) {
        const u = await fetchSession();
        setUser(u);
      }
      return result;
    } catch {
      return { success: false, error: "Erro de conexão com o servidor." };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
    } catch { /* ignore */ }
    setUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

- [ ] **Step 2: Update API route to handle POST and DELETE**

```ts
// src/app/api/auth/session/route.ts
import { loginAction, logoutAction, getSessionAction } from "@/lib/auth/actions";

export async function GET(): Promise<Response> {
  return Response.json(await getSessionAction());
}

export async function POST(request: Request): Promise<Response> {
  const { login, password } = await request.json();
  return Response.json(await loginAction(login, password));
}

export async function DELETE(): Promise<Response> {
  await logoutAction();
  return Response.json({ success: true });
}
```

### Task 9: Create Audit Log

**Files:**
- Create: `src/lib/auth/audit-log.ts`

- [ ] **Step 1: Create audit-log.ts**

```ts
// src/lib/auth/audit-log.ts
import "server-only";

type AuditEvent =
  | "LOGIN_SUCCESS"
  | "LOGIN_SUCCESS_REQUIRES_CHANGE"
  | "LOGIN_FAILURE"
  | "LOGIN_BLOCKED"
  | "LOGOUT"
  | "PASSWORD_CHANGED"
  | "SESSION_EXPIRED"
  | "ACCESS_DENIED"
  | "RATE_LIMIT_TRIGGERED";

interface AuditEntry {
  event: AuditEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

const log: AuditEntry[] = [];

export function auditLog(event: AuditEvent, data: Record<string, unknown>): void {
  const entry: AuditEntry = {
    event,
    timestamp: new Date().toISOString(),
    data: sanitizeData(data),
  };
  log.push(entry);
  // In production, this would write to a file/database/external service
  if (process.env.NODE_ENV === "development") {
    console.log(`[AUDIT] ${entry.event}:`, JSON.stringify(entry.data));
  }
}

function sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...data };
  // Never log sensitive fields
  const sensitiveKeys = ["password", "passwordHash", "token", "secret", "cookie"];
  for (const key of sensitiveKeys) {
    delete sanitized[key];
  }
  return sanitized;
}

export function getAuditLog(): AuditEntry[] {
  return log;
}

export function clearAuditLog(): void {
  log.length = 0;
}
```

### Task 10: Update Deploy Script

**Files:**
- Modify: `scripts/deploy-netlify.mjs`

- [ ] **Step 1: Update deploy-netlify.mjs**

Change version to `"1.2.0"` only. The deploy script still works for static export but after this migration the app needs a Node.js server. Document this.

### Task 11: Force Password Change Feature

**Files:**
- Create: `src/app/change-password/page.tsx`
- Create: `src/auth/components/change-password-form.tsx`

- [ ] **Step 1: Create change-password page**

Simple form that calls `changePasswordAction()` and redirects to /dashboard after success.

### Task 12: Tests

**Files:**
- Create: `src/lib/auth/password-service.test.ts`
- Create: `src/lib/auth/session-service.test.ts`
- Create: `src/lib/auth/user-repository.test.ts`
- Create: `src/lib/auth/auth-service.test.ts`
- Create: `proxy.test.ts` (if vitest supports proxy testing)

- [ ] **Step 1: password-service.test.ts** — Copy and adapt from existing password.test.ts
- [ ] **Step 2: user-repository.test.ts** — Test find, password hash retrieval, mustChangePassword
- [ ] **Step 3: session-service.test.ts** — Test create, validate, destroy, expiration
- [ ] **Step 4: auth-service.test.ts** — Test login flow, rate limiting, invalid credentials
- [ ] **Step 5: Run all tests** — Verify existing tests still pass, new tests pass

### Task 13: Build + Lint + Verify

- [ ] **Step 1: Run `npm run lint`**
- [ ] **Step 2: Run `npx vitest run`** (all tests)
- [ ] **Step 3: Run `npm run build`**
