import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function AccessDenied() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert className="size-7 text-destructive" />
        </div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Acesso Negado
        </h1>
        <p className="max-w-sm text-muted-foreground">
          Você não tem permissão para acessar esta página.
          Entre em contato com o administrador se precisar de acesso.
        </p>
        <Link href="/dashboard">
          <Button>Voltar ao Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
