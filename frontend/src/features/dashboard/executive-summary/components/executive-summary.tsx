import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ExecutiveSummary() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumo Executivo</CardTitle>
        <CardDescription>Visão geral do desempenho da plataforma</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Conteúdo será implementado na próxima sprint.</p>
      </CardContent>
    </Card>
  );
}
