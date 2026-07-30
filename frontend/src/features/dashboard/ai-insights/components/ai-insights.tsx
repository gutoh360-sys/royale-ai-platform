"use client";

import { Loader2, AlertCircle, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AIInsightItem } from "./ai-insight-item";
import {
  mockInsights,
  mockEmptyInsights,
} from "@/features/dashboard/ai-insights/mocks";
import type { AIInsightsState } from "@/features/dashboard/ai-insights/types";

interface AIInsightsProps {
  state?: AIInsightsState;
}

export function AIInsights({ state = "success" }: AIInsightsProps) {
  if (state === "loading") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recomendações da Royale AI</CardTitle>
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
          <CardTitle>Recomendações da Royale AI</CardTitle>
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

  const insights = mockInsights;
  const isEmpty = state === "empty" || mockEmptyInsights.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recomendações da Royale AI</CardTitle>
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
          <div className="flex flex-col gap-3">
            {insights.map((insight) => (
              <AIInsightItem key={insight.id} insight={insight} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
