import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function RecommendationsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recomendações</CardTitle>
        <CardDescription>Sugestões inteligentes para seus produtos</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Conteúdo será implementado na próxima sprint.</p>
      </CardContent>
    </Card>
  );
}
