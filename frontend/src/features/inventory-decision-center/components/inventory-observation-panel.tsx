import { MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface InventoryObservationPanelProps {
  observations: string[];
}

export function InventoryObservationPanel({ observations }: InventoryObservationPanelProps) {
  if (observations.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="size-4 text-muted-foreground" aria-hidden="true" />
          <p className="font-heading text-sm font-semibold">Observações</p>
        </div>
        <div className="flex flex-col gap-2">
          {observations.map((obs, i) => (
            <p key={i} className="text-sm text-muted-foreground leading-relaxed">
              {obs}
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
