import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function InsightsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Insights</CardTitle>
        <CardDescription>Análises profundas geradas por IA</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Conteúdo será implementado na próxima sprint.</p>
      </CardContent>
    </Card>
  );
}
