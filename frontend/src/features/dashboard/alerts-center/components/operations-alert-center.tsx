"use client";

import { Loader2, AlertCircle, Bell, BellOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OperationsAlertItem } from "./operations-alert-item";
import type { AlertData, AlertsState } from "@/features/dashboard/alerts-center/types";

interface OperationsAlertCenterProps {
  alerts?: AlertData[];
  state?: AlertsState;
}

export function OperationsAlertCenter({
  alerts = [],
  state = "success",
}: OperationsAlertCenterProps) {
  if (state === "loading") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="size-4" aria-hidden="true" />
            Alertas Operacionais
          </CardTitle>
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
          <CardTitle className="flex items-center gap-2">
            <Bell className="size-4" aria-hidden="true" />
            Alertas Operacionais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-2 py-8">
            <AlertCircle className="size-5 text-destructive" />
            <p className="text-sm text-muted-foreground">
              Erro ao carregar alertas
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (state === "empty" || alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="size-4" aria-hidden="true" />
            Alertas Operacionais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-2 py-8">
            <BellOff className="size-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhum alerta no momento
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="size-4" aria-hidden="true" />
          Alertas Operacionais
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3" role="list" aria-label="Lista de alertas">
          {alerts.map((alert) => (
            <OperationsAlertItem key={alert.id} alert={alert} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
