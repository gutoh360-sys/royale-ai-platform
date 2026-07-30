import type { ReactNode } from "react";

interface DashboardSectionProps {
  title: string;
  children: ReactNode;
  insight?: string;
}

export function DashboardSection({ title, children, insight }: DashboardSectionProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em]">
        {title}
      </h2>
      {children}
      {insight && (
        <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-primary/30 pl-3">
          {insight}
        </p>
      )}
    </section>
  );
}
