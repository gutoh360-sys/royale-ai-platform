import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary">
            <span className="text-lg font-bold text-primary-foreground">R</span>
          </div>
          <h1 className="font-heading text-lg font-semibold tracking-tight">
            Royale AI Platform
          </h1>
          <p className="text-sm text-muted-foreground">
            Faça login para continuar
          </p>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
