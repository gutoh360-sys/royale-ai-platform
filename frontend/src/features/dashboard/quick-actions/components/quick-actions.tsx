import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ações Rápidas</CardTitle>
        <CardDescription>Atalhos para tarefas frequentes</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Conteúdo será implementado na próxima sprint.</p>
      </CardContent>
    </Card>
  );
}
