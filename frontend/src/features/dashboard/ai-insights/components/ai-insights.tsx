import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AIInsights() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Insights de IA</CardTitle>
        <CardDescription>Recomendações inteligentes para seu negócio</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Conteúdo será implementado na próxima sprint.</p>
      </CardContent>
    </Card>
  );
}
