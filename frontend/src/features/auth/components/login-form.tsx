"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginSchema, type LoginFormData } from "@/features/auth/schemas/login-schema";
import { useLogin } from "@/features/auth/hooks/use-login";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [mockError, setMockError] = useState<string | null>(null);
  const { login, isPending } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginFormData) {
    setMockError(null);
    const result = await login(data);
    if (!result.success) {
      setMockError(result.error ?? "Erro ao fazer login");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {mockError && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {mockError}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          E-mail
        </label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          {...register("email")}
          aria-invalid={!!errors.email}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
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
            placeholder="Sua senha"
            className="pr-9"
            {...register("password")}
            aria-invalid={!!errors.password}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isPending} className="mt-2">
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Entrando...
          </>
        ) : (
          "Entrar"
        )}
      </Button>
    </form>
  );
}
