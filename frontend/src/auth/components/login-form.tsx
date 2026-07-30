"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/auth/session/auth-provider";

const formSchema = z.object({
  login: z
    .string()
    .min(1, "Usuário é obrigatório")
    .max(100, "Usuário muito longo")
    .transform((v) => v.trim()),
  password: z
    .string()
    .min(1, "Senha é obrigatória")
    .max(128, "Senha muito longa"),
  remember: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      login: "",
      password: "",
      remember: localStorage.getItem("royale_remember_login") === "true",
    },
  });

  async function onSubmit(data: FormData) {
    setIsPending(true);
    if (data.remember) {
      localStorage.setItem("royale_remember_login", "true");
    } else {
      localStorage.removeItem("royale_remember_login");
    }
    const result = await login(data.login, data.password);
    setIsPending(false);
    if (result.success) {
      router.push("/dashboard");
    } else {
      setError("root", { message: result.error ?? "Erro ao fazer login." });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !isPending) {
      handleSubmit(onSubmit)();
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <AnimatePresence mode="wait">
        {errors.root && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            role="alert"
            className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          >
            <AlertCircle className="size-4 shrink-0" />
            <span>{errors.root.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="login" className="text-sm font-medium">
          Usuário
        </label>
        <Input
          id="login"
          type="text"
          autoComplete="username"
          placeholder="Seu usuário"
          disabled={isPending}
          autoFocus
          {...register("login")}
          aria-invalid={!!errors.login}
          aria-describedby={errors.login ? "login-error" : undefined}
        />
        {errors.login && (
          <p id="login-error" className="text-xs text-destructive" role="alert">
            {errors.login.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Senha
        </label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Sua senha"
            className="pr-10"
            disabled={isPending}
            onKeyDown={handleKeyDown}
            {...register("password")}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
        {errors.password && (
          <p id="password-error" className="text-xs text-destructive" role="alert">
            {errors.password.message}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          id="remember"
          type="checkbox"
          className="size-4 rounded border-border bg-background text-primary accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          {...register("remember")}
        />
        <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer select-none">
          Lembrar-me
        </label>
      </div>

      <Button type="submit" disabled={isPending} className="relative mt-1">
        <span className={isPending ? "invisible" : "visible"}>
          Entrar
        </span>
        {isPending && (
          <Loader2 className="absolute size-4 animate-spin" />
        )}
      </Button>
    </form>
  );
}
