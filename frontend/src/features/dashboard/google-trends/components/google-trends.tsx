import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function GoogleTrends() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tendências Google</CardTitle>
        <CardDescription>Popularidade de busca dos seus produtos</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Conteúdo será implementado na próxima sprint.</p>
      </CardContent>
    </Card>
  );
}
