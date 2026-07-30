import { Construction } from "lucide-react";

interface ModulePlaceholderProps {
  title?: string;
  description?: string;
}

export function ModulePlaceholder({
  title = "Módulo em desenvolvimento",
  description = "Este módulo estará disponível em breve.",
}: ModulePlaceholderProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="flex flex-col items-center gap-4 py-12">
        <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
          <Construction className="size-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
