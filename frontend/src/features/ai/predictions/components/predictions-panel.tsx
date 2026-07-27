import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PredictionsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Previsões</CardTitle>
        <CardDescription>Projeções de vendas e demanda</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Conteúdo será implementado na próxima sprint.</p>
      </CardContent>
    </Card>
  );
}
