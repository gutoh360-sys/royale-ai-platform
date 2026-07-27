import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AssistantPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assistente IA</CardTitle>
        <CardDescription>Assistente inteligente para operações diárias</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Conteúdo será implementado na próxima sprint.</p>
      </CardContent>
    </Card>
  );
}
