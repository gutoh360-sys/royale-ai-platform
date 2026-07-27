import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AlertsCenter() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Central de Alertas</CardTitle>
        <CardDescription>Notificações e eventos importantes</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Conteúdo será implementado na próxima sprint.</p>
      </CardContent>
    </Card>
  );
}
