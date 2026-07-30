"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import type { NextAction } from "@/features/marketplace/utils/insights";

interface MarketplaceNextActionsProps {
  actions: NextAction[];
}

export function MarketplaceNextActions({ actions }: MarketplaceNextActionsProps) {
  if (actions.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-0">
        <ol className="divide-y" role="list" aria-label="Próximas ações">
          {actions.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-muted/20"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-sm leading-snug">{item.action}</p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground/40 mt-0.5 shrink-0" aria-hidden="true" />
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
