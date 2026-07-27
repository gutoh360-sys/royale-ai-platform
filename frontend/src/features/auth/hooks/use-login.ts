"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { LoginInput, LoginResult } from "@/features/auth/types/auth-types";

export function useLogin() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const login = useCallback(
    async (input: LoginInput): Promise<LoginResult> => {
      void input;
      setIsPending(true);
      await new Promise((resolve) => setTimeout(resolve, 800));
      setIsPending(false);
      router.push("/app");
      return { success: true };
    },
    [router],
  );

  return { login, isPending };
}
