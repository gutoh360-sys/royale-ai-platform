import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Atividade Recente</CardTitle>
        <CardDescription>Últimas ações na plataforma</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Conteúdo será implementado na próxima sprint.</p>
      </CardContent>
    </Card>
  );
}
