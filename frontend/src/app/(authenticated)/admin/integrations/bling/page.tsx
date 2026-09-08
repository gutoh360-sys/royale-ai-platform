"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageTitle } from "@/components/shell/page-title";
import { runProductBatches, runOrderItemBatches } from "@/services/sync-batches";
import { invalidateProductSales } from "@/services/product-sales";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  Package,
  RefreshCw,
  ShoppingCart,
  Store,
  XCircle,
} from "lucide-react";
import {
  parseEnhancedSyncStatus,
  type EnhancedSyncStatus,
  type SyncAllPhase,
  type SyncAllResult,
} from "./sync-central-state";

interface LogEntry {
  time: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
}

type SyncStatusEnum = "idle" | "running" | "completed" | "error";

const PHASE_LABELS: Record<string, string> = {
  products: "Catálogo de produtos",
  orders: "Pedidos",
  order_items: "Itens dos pedidos",
  channels: "Canais de venda",
};

function timestamp() {
  return new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatNumber(n: unknown): string {
  return typeof n === "number" && Number.isFinite(n)
    ? n.toLocaleString("pt-BR")
    : "0";
}

function relativeTime(iso: string | null): string {
  if (!iso) return "Nunca";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "Agora mesmo";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}min atrás`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h atrás`;
  return `${Math.floor(diff / 86_400_000)}d atrás`;
}

function connectionStatus(s: EnhancedSyncStatus | null, sync: SyncStatusEnum): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  icon: React.ReactNode;
} {
  if (sync === "running") {
    return { label: "Sincronizando", variant: "default", icon: <Loader2 className="h-3 w-3 animate-spin" /> };
  }
  if (sync === "error") {
    return { label: "Erro", variant: "destructive", icon: <XCircle className="h-3 w-3" /> };
  }
  if (!s) {
    return { label: "Desconhecido", variant: "outline", icon: <AlertTriangle className="h-3 w-3" /> };
  }
  return { label: "Conectado", variant: "secondary", icon: <CheckCircle2 className="h-3 w-3" /> };
}

function lastSyncTime(s: EnhancedSyncStatus | null): string {
  if (!s) return "Nunca";
  const times = [
    s.products_last_synced_at,
    s.orders_last_synced_at,
    s.order_items_last_synced_at,
    s.channels_last_synced_at,
  ].filter(Boolean) as string[];
  if (times.length === 0) return "Nunca";
  return relativeTime(times.sort().pop()!);
}

export default function BlingSyncPage() {
  const [status, setStatus] = useState<EnhancedSyncStatus | null>(null);
  const [lockHeld, setLockHeld] = useState(false);
  const [sync, setSync] = useState<SyncStatusEnum>("idle");
  const [syncAllResult, setSyncAllResult] = useState<SyncAllResult | null>(null);
  const [phaseProgress, setPhaseProgress] = useState<string>("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const runningRef = useRef(false);
  const abortRef = useRef(false);

  const addLog = useCallback((message: string, type: LogEntry["type"] = "info") => {
    setLogs((prev) => [...prev.slice(-49), { time: timestamp(), message, type }]);
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const [statusRes, lockRes] = await Promise.all([
        fetch("/api/integrations/sync-status"),
        fetch("/api/integrations/lock-status"),
      ]);

      if (statusRes.ok) {
        const raw = await statusRes.json();
        const parsed = parseEnhancedSyncStatus(raw);
        setStatus(parsed);
      }

      if (lockRes.ok) {
        const lockData = await lockRes.json();
        setLockHeld(!!lockData.locked);
      }

      setError(null);
    } catch {
      setError("Não foi possível carregar o status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const runSyncAll = useCallback(async () => {
    if (runningRef.current || lockHeld) return;
    runningRef.current = true;
    abortRef.current = false;
    setSync("running");
    setSyncAllResult(null);
    addLog("Sincronização completa iniciada");

    try {
      await runProductBatches(addLog);
      for (const entity of ["orders", "marketplaces"]) {
        setPhaseProgress(`Sincronizando ${entity}...`);
        const res = await fetch("/api/integrations/sync-entity", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json();
        if (result.status !== "completed" || result.items_failed) throw new Error(`Falha em ${entity}`);
      }
      await runOrderItemBatches(addLog);
      invalidateProductSales();
      addLog("Sincronizacao concluida; confira a cobertura dos itens", "success");
      setSync("completed");
      void fetchStatus();
    } catch (err) {
      setSync("error");
      addLog(`Erro: ${err instanceof Error ? err.message : "desconhecido"}`, "error");
    } finally {
      runningRef.current = false;
      setPhaseProgress("");
    }
  }, [lockHeld, addLog, fetchStatus]);

  const syncEntity = useCallback(async (entity: string) => {
    if (runningRef.current) return;
    runningRef.current = true;
    setSync("running");
    setPhaseProgress(`Sincronizando ${PHASE_LABELS[entity] || entity}...`);
    addLog(`Sincronizando ${PHASE_LABELS[entity] || entity}...`);

    try {
      if (entity === "products") {
        await runProductBatches(addLog);
      } else {
        const res = await fetch("/api/integrations/sync-entity", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json();
        if (result.status !== "completed" || result.items_failed) throw new Error("Sincronizacao parcial");
      }
      invalidateProductSales();
      addLog(`${PHASE_LABELS[entity] || entity} concluído`, "success");
      setSync("completed");
      void fetchStatus();
    } catch (err) {
      setSync("error");
      addLog(`Erro ao sincronizar ${entity}: ${err instanceof Error ? err.message : "desconhecido"}`, "error");
    } finally {
      runningRef.current = false;
      setPhaseProgress("");
    }
  }, [addLog, fetchStatus]);

  const backfillOrderItems = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setSync("running");
    addLog("Backfill de itens dos pedidos iniciado");

    try {
      await runOrderItemBatches(addLog);
      addLog("Backfill de itens concluído", "success");
      setSync("completed");
      void fetchStatus();
    } catch (err) {
      setSync("error");
      addLog(`Erro no backfill: ${err instanceof Error ? err.message : "desconhecido"}`, "error");
    } finally {
      runningRef.current = false;
      setPhaseProgress("");
    }
  }, [addLog, fetchStatus]);

  const cs = connectionStatus(status, sync);

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageTitle
        title="Integrações"
        description="Sincronização e backfill do Bling."
      />

      {/* Tier 1 — Status Geral */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-4">
            <Badge variant={cs.variant} className="gap-1.5 px-3 py-1.5 text-sm">
              {cs.icon}
              {cs.label}
            </Badge>
            <div className="text-sm text-muted-foreground">
              Última sincronização: <span className="font-medium text-foreground">{lastSyncTime(status)}</span>
            </div>
          </div>
          <Button
            size="lg"
            onClick={runSyncAll}
            disabled={sync === "running" || lockHeld}
            className="gap-2"
          >
            {sync === "running" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            SINCRONIZAR TUDO AGORA
          </Button>
        </CardContent>
        {phaseProgress && (
          <div className="border-t px-6 py-2 text-sm text-muted-foreground">
            <Loader2 className="mr-1.5 inline h-3 w-3 animate-spin" />
            {phaseProgress}
          </div>
        )}
        {error && (
          <div className="border-t border-destructive/30 bg-destructive/10 px-6 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
      </Card>

      {/* Tier 2 — Domain Cards */}
      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando status...</div>
      ) : status ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DomainCard
            title="Produtos"
            icon={<Package className="h-4 w-4" />}
            count={status.products_count}
            subtitle={`${formatNumber(status.zero_stock)} com estoque zero`}
            lastSync={status.products_last_synced_at}
            onSync={() => syncEntity("products")}
            disabled={sync === "running"}
          />
          <DomainCard
            title="Pedidos"
            icon={<ShoppingCart className="h-4 w-4" />}
            count={status.orders_count}
            subtitle={`${formatNumber(status.orders_without_channel)} sem canal`}
            lastSync={status.orders_last_synced_at}
            onSync={() => syncEntity("orders")}
            disabled={sync === "running"}
          />
          <DomainCard
            title="Itens dos Pedidos"
            icon={<ShoppingCart className="h-4 w-4" />}
            count={status.order_items_count}
            subtitle={`${formatNumber(status.orders_without_items)} pedidos sem itens`}
            lastSync={status.order_items_last_synced_at}
            onSync={backfillOrderItems}
            disabled={sync === "running"}
            actionLabel="Completar"
          />
          <DomainCard
            title="Canais"
            icon={<Store className="h-4 w-4" />}
            count={status.orders_without_channel + (status.orders_count - status.orders_without_channel)}
            subtitle={`${formatNumber(status.orders_without_channel)} pedidos sem canal`}
            lastSync={status.channels_last_synced_at}
            onSync={() => syncEntity("marketplaces")}
            disabled={sync === "running"}
          />
        </div>
      ) : null}

      {/* Tier 3 — Pendências + Detalhes */}
      <Card>
          <CardContent className="space-y-3 py-4">
            {status ? (
              <div className="flex flex-wrap gap-3 text-sm">
                {status.orders_without_items > 0 && (
                  <Badge variant="outline" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {formatNumber(status.orders_without_items)} pedidos sem itens
                  </Badge>
                )}
                {status.orders_without_channel > 0 && (
                  <Badge variant="outline" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {formatNumber(status.orders_without_channel)} pedidos sem canal
                  </Badge>
                )}
                {status.zero_stock > 0 && (
                  <Badge variant="outline" className="gap-1">
                    <Package className="h-3 w-3" />
                    {formatNumber(status.zero_stock)} produtos com estoque zero
                  </Badge>
                )}
                {status.product_checkpoint && (
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="h-3 w-3" />
                    Checkpoint: página {status.product_checkpoint.last_completed_page}
                  </Badge>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Nenhuma pendência carregada.</div>
            )}

            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {showDetails ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              Detalhes técnicos
            </button>

            {showDetails && (
              <div className="space-y-3">
                {syncAllResult && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Última sincronização completa
                    </div>
                    <div className="grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
                      {syncAllResult.phases.map((phase) => (
                        <div key={phase.phase} className="flex items-center justify-between rounded border px-3 py-1.5">
                          <span>{PHASE_LABELS[phase.phase] || phase.phase}</span>
                          <PhaseStatusBadge status={phase.status} />
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Status geral: {syncAllResult.overall_status}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Log de atividade
                  </div>
                  <div className="max-h-48 space-y-1 overflow-y-auto rounded border p-3 font-mono text-xs">
                    {logs.length === 0 && (
                      <div className="text-muted-foreground">Nenhuma atividade ainda.</div>
                    )}
                    {logs.map((log, i) => (
                      <div key={`${log.time}-${i}`} className="flex items-start gap-2">
                        {logIcon(log.type)}
                        <span className="text-muted-foreground">{log.time}</span>
                        <span>{log.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
}

function DomainCard({
  title,
  icon,
  count,
  subtitle,
  lastSync,
  onSync,
  disabled,
  actionLabel = "Sincronizar",
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  subtitle: string;
  lastSync: string | null;
  onSync: () => void;
  disabled: boolean;
  actionLabel?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between py-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-medium">
            {icon}
            {title}
          </div>
          <div className="text-2xl font-bold">{formatNumber(count)}</div>
          <div className="text-xs text-muted-foreground">{subtitle}</div>
          <div className="text-xs text-muted-foreground">
            Atualizado: {relativeTime(lastSync)}
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onSync}
          disabled={disabled}
          className="gap-1.5"
        >
          <RefreshCw className="h-3 w-3" />
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

function PhaseStatusBadge({ status }: { status: SyncAllPhase["status"] }) {
  const config = {
    pending: { label: "Pendente", variant: "outline" as const },
    running: { label: "Executando", variant: "default" as const },
    completed: { label: "Concluído", variant: "secondary" as const },
    failed: { label: "Falhou", variant: "destructive" as const },
    skipped: { label: "Ignorado", variant: "outline" as const },
  };
  const c = config[status];
  return <Badge variant={c.variant} className="text-xs">{c.label}</Badge>;
}

function logIcon(type: LogEntry["type"]) {
  switch (type) {
    case "success":
      return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
    case "error":
      return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
    case "warning":
      return <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />;
    default:
      return <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}
