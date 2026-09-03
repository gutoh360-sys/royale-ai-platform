"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageTitle } from "@/components/shell/page-title";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Package,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  ShoppingCart,
  XCircle,
} from "lucide-react";
import {
  PRODUCT_SYNC_FALLBACK,
  parseProductSyncState,
  parseSyncStatus,
  type ProductSyncTotals,
  type SyncStatus,
} from "./sync-central-state";

interface ProductBatchResult {
  start_page: number;
  end_page: number;
  pages_processed: number;
  fetched: number;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  next_page: number | null;
  has_more: boolean;
  natural_end: boolean;
  skip_reasons: Record<string, number>;
}

interface OrderItemsResult {
  selected: number;
  processed: number;
  orders_enriched: number;
  items_created: number;
  unknown_products: number;
  detail_without_items: number;
  not_found: number;
  failed: number;
  remaining_without_items: number;
  next_cursor: string | null;
  has_more: boolean;
}

interface LogEntry {
  time: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
}

type SyncStatusEnum = "idle" | "running" | "paused" | "completed" | "error";
type AddLog = (message: string, type?: LogEntry["type"]) => void;

const STORAGE_KEY_PRODUCTS = "royale-sync-products";

function readStoredProductSyncState() {
  if (typeof window === "undefined") return PRODUCT_SYNC_FALLBACK;
  try {
    return parseProductSyncState(window.localStorage.getItem(STORAGE_KEY_PRODUCTS));
  } catch {
    return PRODUCT_SYNC_FALLBACK;
  }
}

function saveProductSyncState(value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(value));
  } catch {
    return;
  }
}

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

export default function BlingSyncPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const addLog = useCallback<AddLog>((message, type = "info") => {
    setLogs((prev) => [...prev.slice(-49), { time: timestamp(), message, type }]);
  }, []);

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageTitle
        title="Central de Sincronização Bling"
        description="Operações de sincronização e backfill do Bling."
      />
      <ProductSyncCard addLog={addLog} />
      <OrderItemsCard addLog={addLog} />
      <ActivityLog logs={logs} />
    </div>
  );
}

function ProductSyncCard({ addLog }: { addLog: AddLog }) {
  const [status, setStatus] = useState<SyncStatusEnum>("idle");
  const [startPage, setStartPage] = useState(PRODUCT_SYNC_FALLBACK.startPage);
  const [currentPage, setCurrentPage] = useState(PRODUCT_SYNC_FALLBACK.currentPage);
  const [totals, setTotals] = useState<ProductSyncTotals>(PRODUCT_SYNC_FALLBACK.totals);
  const [lastBatch, setLastBatch] = useState<ProductBatchResult | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const runningRef = useRef(false);
  const abortRef = useRef(false);

  useEffect(() => {
    const saved = readStoredProductSyncState();
    setStartPage(saved.startPage);
    setCurrentPage(saved.currentPage);
    setTotals(saved.totals);
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    saveProductSyncState({ startPage, currentPage, totals });
  }, [storageReady, startPage, currentPage, totals]);

  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    setStatusError(null);

    try {
      const res = await fetch("/api/integrations/sync-status");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const parsed = parseSyncStatus(await res.json());
      if (!parsed) throw new Error("Resposta inválida");

      setSyncStatus(parsed);
    } catch (err) {
      setSyncStatus(null);
      setStatusError("Não foi possível carregar o status");
      addLog(
        `Erro ao carregar status: ${err instanceof Error ? err.message : "desconhecido"}`,
        "error",
      );
    } finally {
      setStatusLoading(false);
    }
  }, [addLog]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const runBatch = useCallback(async (page: number): Promise<ProductBatchResult> => {
    const res = await fetch("/api/integrations/sync-products-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start_page: page, pages: 10 }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }, []);

  const startSync = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    abortRef.current = false;
    setStatus("running");
    addLog(`Páginas ${startPage}-${startPage + 9} iniciadas`);

    let page = startPage;
    try {
      while (!abortRef.current) {
        const result = await runBatch(page);
        setLastBatch(result);
        setTotals((prev) => ({
          fetched: prev.fetched + result.fetched,
          processed: prev.processed + result.processed,
          created: prev.created + result.created,
          updated: prev.updated + result.updated,
          skipped: prev.skipped + result.skipped,
          failed: prev.failed + result.failed,
        }));

        addLog(
          `${result.start_page}-${result.end_page} concluído: ${formatNumber(result.processed)} processados, ${formatNumber(result.created)} criados, ${formatNumber(result.skipped)} ignorados`,
          result.failed > 0 ? "error" : "success",
        );

        if (result.failed > 0) {
          setStatus("error");
          addLog(`Sincronização pausada: ${result.failed} registro(s) com falha`, "error");
          break;
        }

        if (result.natural_end || !result.has_more || !result.next_page) {
          setStatus("completed");
          addLog("Catálogo concluído", "success");
          void fetchStatus();
          break;
        }

        page = result.next_page;
        setCurrentPage(page);
        setStartPage(page);
      }
    } catch (err) {
      setStatus("error");
      addLog(`Erro: ${err instanceof Error ? err.message : "desconhecido"}`, "error");
    } finally {
      runningRef.current = false;
    }
  }, [startPage, runBatch, addLog, fetchStatus]);

  const pause = useCallback(() => {
    abortRef.current = true;
    setStatus("paused");
    addLog("Sincronização pausada", "warning");
  }, [addLog]);

  const reset = useCallback(() => {
    abortRef.current = true;
    runningRef.current = false;
    setStatus("idle");
    setCurrentPage(PRODUCT_SYNC_FALLBACK.currentPage);
    setStartPage(PRODUCT_SYNC_FALLBACK.startPage);
    setTotals(PRODUCT_SYNC_FALLBACK.totals);
    setLastBatch(null);
    addLog("Estado resetado", "info");
  }, [addLog]);

  const sc = statusConfig[status];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Produtos
          </CardTitle>
          <Badge variant={sc.variant} className="gap-1">
            {sc.icon}
            {sc.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {statusError ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <span>{statusError}</span>
            <Button size="sm" variant="outline" onClick={() => void fetchStatus()}>
              Tentar novamente
            </Button>
          </div>
        ) : syncStatus ? (
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
            <Stat label="Produtos no Royale" value={formatNumber(syncStatus.products_count)} />
            <Stat label="Pedidos" value={formatNumber(syncStatus.orders_count)} />
            <Stat label="Itens de pedido" value={formatNumber(syncStatus.order_items_count)} />
            <Stat label="Pedidos sem itens" value={formatNumber(syncStatus.orders_without_items)} />
            <Stat label="Sem canal" value={formatNumber(syncStatus.orders_without_channel)} />
          </div>
        ) : statusLoading ? (
          <div className="text-sm text-muted-foreground">Carregando status...</div>
        ) : null}

        <div className="flex flex-wrap items-end gap-3">
          <div className="w-32">
            <label className="mb-1 block text-xs text-muted-foreground">Começar da página</label>
            <Input
              type="number"
              min={1}
              value={startPage}
              onChange={(e) => setStartPage(Math.max(1, parseInt(e.target.value, 10) || 1))}
              disabled={status === "running"}
              className="h-8"
            />
          </div>
          <div className="flex gap-2">
            {(status === "idle" || status === "completed" || status === "error") && (
              <Button size="sm" onClick={startSync} className="gap-1.5">
                <Play className="h-3.5 w-3.5" />
                Sincronizar catálogo
              </Button>
            )}
            {status === "running" && (
              <Button size="sm" variant="outline" onClick={pause} className="gap-1.5">
                <Pause className="h-3.5 w-3.5" />
                Pausar
              </Button>
            )}
            {status === "paused" && (
              <Button size="sm" onClick={startSync} className="gap-1.5">
                <Play className="h-3.5 w-3.5" />
                Retomar
              </Button>
            )}
            {status !== "idle" && (
              <Button size="sm" variant="ghost" onClick={reset} className="gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" />
                Reiniciar
              </Button>
            )}
          </div>
        </div>

        {totals.fetched > 0 && (
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-6">
            <Stat label="Lidos" value={formatNumber(totals.fetched)} />
            <Stat label="Processados" value={formatNumber(totals.processed)} />
            <Stat label="Criados" value={formatNumber(totals.created)} />
            <Stat label="Atualizados" value={formatNumber(totals.updated)} />
            <Stat label="Ignorados" value={formatNumber(totals.skipped)} />
            <Stat label="Falhas" value={formatNumber(totals.failed)} className={totals.failed > 0 ? "text-destructive" : ""} />
          </div>
        )}

        {lastBatch?.skip_reasons && Object.keys(lastBatch.skip_reasons).length > 0 && (
          <div className="text-xs text-muted-foreground">
            Skip reasons: {Object.entries(lastBatch.skip_reasons).map(([k, v]) => `${k}=${v}`).join(", ")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OrderItemsCard({ addLog }: { addLog: AddLog }) {
  const [status, setStatus] = useState<SyncStatusEnum>("idle");
  const [totals, setTotals] = useState({
    processed: 0,
    orders_enriched: 0,
    items_created: 0,
    unknown_products: 0,
    not_found: 0,
    failed: 0,
  });
  const [remaining, setRemaining] = useState<number | null>(null);
  const runningRef = useRef(false);
  const abortRef = useRef(false);

  const runBatch = useCallback(async (cursor?: string): Promise<OrderItemsResult> => {
    const res = await fetch("/api/integrations/backfill-order-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 50, after_external_id: cursor }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }, []);

  const startBackfill = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    abortRef.current = false;
    setStatus("running");
    addLog("Backfill de itens dos pedidos iniciado");

    let cursor: string | undefined;
    try {
      while (!abortRef.current) {
        const result = await runBatch(cursor);
        setTotals((prev) => ({
          processed: prev.processed + result.processed,
          orders_enriched: prev.orders_enriched + result.orders_enriched,
          items_created: prev.items_created + result.items_created,
          unknown_products: prev.unknown_products + result.unknown_products,
          not_found: prev.not_found + result.not_found,
          failed: prev.failed + result.failed,
        }));
        setRemaining(result.remaining_without_items);

        addLog(
          `Batch: ${result.processed} processados, ${result.items_created} itens criados, ${result.remaining_without_items} restantes`,
          result.failed > 0 ? "error" : "success",
        );

        if (result.failed > 0) {
          setStatus("error");
          addLog(`Backfill pausado: ${result.failed} falha(s)`, "error");
          break;
        }

        if (!result.has_more || !result.next_cursor) {
          setStatus("completed");
          addLog("Backfill concluído", "success");
          break;
        }

        cursor = result.next_cursor;
      }
    } catch (err) {
      setStatus("error");
      addLog(`Erro: ${err instanceof Error ? err.message : "desconhecido"}`, "error");
    } finally {
      runningRef.current = false;
    }
  }, [runBatch, addLog]);

  const pause = useCallback(() => {
    abortRef.current = true;
    setStatus("paused");
    addLog("Backfill pausado", "warning");
  }, [addLog]);

  const sc = statusConfig[status];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Itens dos Pedidos
          </CardTitle>
          <Badge variant={sc.variant} className="gap-1">
            {sc.icon}
            {sc.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          {(status === "idle" || status === "completed" || status === "error") && (
            <Button size="sm" onClick={startBackfill} className="gap-1.5">
              <Play className="h-3.5 w-3.5" />
              Completar itens dos pedidos
            </Button>
          )}
          {status === "running" && (
            <Button size="sm" variant="outline" onClick={pause} className="gap-1.5">
              <Pause className="h-3.5 w-3.5" />
              Pausar
            </Button>
          )}
        </div>

        {totals.processed > 0 && (
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-6">
            <Stat label="Processados" value={formatNumber(totals.processed)} />
            <Stat label="Pedidos enriquecidos" value={formatNumber(totals.orders_enriched)} />
            <Stat label="Itens criados" value={formatNumber(totals.items_created)} />
            <Stat label="Produtos desconhecidos" value={formatNumber(totals.unknown_products)} className={totals.unknown_products > 0 ? "text-yellow-500" : ""} />
            <Stat label="Não encontrados" value={formatNumber(totals.not_found)} />
            <Stat label="Falhas" value={formatNumber(totals.failed)} className={totals.failed > 0 ? "text-destructive" : ""} />
          </div>
        )}

        {remaining !== null && (
          <div className="text-xs text-muted-foreground">
            Pedidos restantes sem itens: {formatNumber(remaining)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActivityLog({ logs }: { logs: LogEntry[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Atividade</CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} className="max-h-64 space-y-1 overflow-y-auto font-mono text-xs">
          {logs.length === 0 && (
            <div className="text-muted-foreground">Nenhuma atividade ainda.</div>
          )}
          {logs.map((log, i) => (
            <div key={`${log.time}-${i}`} className="flex items-start gap-2">
              {iconForType(log.type)}
              <span className="text-muted-foreground">{log.time}</span>
              <span>{log.message}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-medium ${className ?? ""}`}>{value}</div>
    </div>
  );
}

const statusConfig: Record<
  SyncStatusEnum,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: ReactNode }
> = {
  idle: { label: "Parado", variant: "secondary", icon: <Package className="h-3 w-3" /> },
  running: { label: "Executando", variant: "default", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  paused: { label: "Pausado", variant: "outline", icon: <Pause className="h-3 w-3" /> },
  completed: { label: "Concluído", variant: "default", icon: <CheckCircle2 className="h-3 w-3" /> },
  error: { label: "Erro", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
};

function iconForType(type: LogEntry["type"]) {
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
