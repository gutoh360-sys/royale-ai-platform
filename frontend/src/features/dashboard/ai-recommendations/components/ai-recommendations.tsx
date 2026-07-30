"use client";

import { Loader2, AlertCircle, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AIRecommendationItem } from "./ai-recommendation-item";
import type { AIRecommendationData, AIRecommendationsState } from "@/features/dashboard/ai-recommendations/types";

interface AIRecommendationsProps {
  recommendations?: AIRecommendationData[];
  state?: AIRecommendationsState;
}

export function AIRecommendations({
  recommendations = [],
  state = "success",
}: AIRecommendationsProps) {
  if (state === "loading") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Royale AI recomenda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (state === "error") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Royale AI recomenda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-2 py-8">
            <AlertCircle className="size-5 text-destructive" />
            <p className="text-sm text-muted-foreground">
              Erro ao carregar recomendações
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isEmpty = state === "empty" || recommendations.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Royale AI recomenda</CardTitle>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex items-center justify-center gap-2 py-8">
            <Lightbulb className="size-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhuma recomendação disponível no momento
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {recommendations.map((rec) => (
              <AIRecommendationItem key={rec.id} recommendation={rec} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
