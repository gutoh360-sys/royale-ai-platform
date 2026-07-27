import { cn } from "@/lib/utils";

interface LogoProps {
  collapsed?: boolean;
  className?: string;
}

export function Logo({ collapsed, className }: LogoProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2",
        collapsed && "justify-center",
        className,
      )}
    >
      <div className="flex size-7 items-center justify-center rounded-lg bg-primary">
        <span className="text-xs font-bold text-primary-foreground">R</span>
      </div>
      {!collapsed && (
        <span className="font-heading text-sm font-semibold tracking-tight">
          Royale
        </span>
      )}
    </div>
  );
}
