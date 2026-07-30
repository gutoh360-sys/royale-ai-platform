import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OpportunityItem } from "@/features/dashboard/executive-command-center/types";

interface OpportunityPanelProps {
  items: OpportunityItem[];
}

export function OpportunityPanel({ items }: OpportunityPanelProps) {
  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="size-4 text-success" aria-hidden="true" />
          Oportunidades
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2" role="list" aria-label="Oportunidades identificadas">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-lg border border-success/20 bg-success/5 p-3"
              role="listitem"
            >
              <div className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
                <TrendingUp className="size-3.5 text-success" aria-hidden="true" />
              </div>
              <p className="text-sm leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
