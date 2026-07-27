import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AlertsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alertas Inteligentes</CardTitle>
        <CardDescription>Notificações preditivas baseadas em IA</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Conteúdo será implementado na próxima sprint.</p>
      </CardContent>
    </Card>
  );
}
