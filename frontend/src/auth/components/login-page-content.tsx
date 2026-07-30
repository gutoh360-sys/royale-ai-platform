"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { LoginForm } from "./login-form";
import { useAuth } from "@/auth/session/auth-provider";

export function LoginPageContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/dashboard");
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
        className="w-full max-w-xs"
      >
        <div className="mb-8 flex flex-col items-center gap-3">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="flex size-11 items-center justify-center rounded-xl bg-primary shadow-sm"
          >
            <span className="text-lg font-bold text-primary-foreground">R</span>
          </motion.div>
          <div className="text-center">
            <h1 className="font-heading text-xl font-semibold tracking-tight">
              Royale AI Platform
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Faça login para continuar
            </p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="rounded-xl border bg-card p-6 shadow-sm"
        >
          <LoginForm />
        </motion.div>
      </motion.div>
    </div>
  );
}
