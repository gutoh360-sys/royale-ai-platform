"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@/auth/domain/types";
import { login as doLogin, logout as doLogout, getCurrentSession } from "@/auth/application/auth-service";
import { sessionToAuthUser } from "@/auth/infrastructure/session";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (loginId: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  login: async () => ({ success: false }),
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const session = await getCurrentSession();
      if (!cancelled) {
        setUser(session ? sessionToAuthUser(session) : null);
        setIsLoading(false);
      }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (loginId: string, password: string) => {
    const result = await doLogin(loginId, password);
    if (result.success) {
      const session = await getCurrentSession();
      setUser(session ? sessionToAuthUser(session) : null);
    }
    return result;
  }, []);

  const logout = useCallback(async () => {
    doLogout();
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
