export interface SyncStatus {
  products_count: number;
  orders_count: number;
  order_items_count: number;
  orders_without_items: number;
  orders_without_channel: number;
}

export interface ProductSyncTotals {
  fetched: number;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
}

export interface ProductSyncState {
  startPage: number;
  currentPage: number;
  totals: ProductSyncTotals;
}

export const PRODUCT_SYNC_FALLBACK: ProductSyncState = {
  startPage: 1,
  currentPage: 1,
  totals: {
    fetched: 0,
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  },
};

const SYNC_STATUS_FIELDS = [
  "products_count",
  "orders_count",
  "order_items_count",
  "orders_without_items",
  "orders_without_channel",
] as const;

const PRODUCT_TOTAL_FIELDS = [
  "fetched",
  "processed",
  "created",
  "updated",
  "skipped",
  "failed",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && isSafeNumber(value) && value >= 1;
}

export function parseSyncStatus(value: unknown): SyncStatus | null {
  if (!isRecord(value)) return null;

  for (const field of SYNC_STATUS_FIELDS) {
    if (!isSafeNumber(value[field])) return null;
  }

  const status = value as Record<(typeof SYNC_STATUS_FIELDS)[number], number>;

  return {
    products_count: status.products_count,
    orders_count: status.orders_count,
    order_items_count: status.order_items_count,
    orders_without_items: status.orders_without_items,
    orders_without_channel: status.orders_without_channel,
  };
}

export function parseProductSyncState(raw: string | null): ProductSyncState {
  if (!raw) return PRODUCT_SYNC_FALLBACK;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return PRODUCT_SYNC_FALLBACK;
  }

  if (!isRecord(parsed) || !isRecord(parsed.totals)) {
    return PRODUCT_SYNC_FALLBACK;
  }

  if (!isPositiveInteger(parsed.startPage) || !isPositiveInteger(parsed.currentPage)) {
    return PRODUCT_SYNC_FALLBACK;
  }

  for (const field of PRODUCT_TOTAL_FIELDS) {
    if (!isSafeNumber(parsed.totals[field])) return PRODUCT_SYNC_FALLBACK;
  }

  const totals = parsed.totals as Record<(typeof PRODUCT_TOTAL_FIELDS)[number], number>;

  return {
    startPage: parsed.startPage,
    currentPage: parsed.currentPage,
    totals: {
      fetched: totals.fetched,
      processed: totals.processed,
      created: totals.created,
      updated: totals.updated,
      skipped: totals.skipped,
      failed: totals.failed,
    },
  };
}
