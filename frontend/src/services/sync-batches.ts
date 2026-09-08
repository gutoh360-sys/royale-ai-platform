import { invalidateProductSales } from "@/services/product-sales";

export async function runProductBatches(progress: (message: string) => void) {
  const key = "bling-product-operation";
  const operation = sessionStorage.getItem(key) ?? crypto.randomUUID();
  sessionStorage.setItem(key, operation);
  let more = true;
  while (more) {
    const res = await fetch("/api/integrations/sync-products-batch", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pages: 5, operation_id: operation }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}; retome a sincronizacao para continuar`);
    const result = await res.json();
    progress(`Produtos: paginas ${result.start_page}-${result.end_page}`);
    invalidateProductSales();
    if (result.failed) throw new Error("Lote com falhas; checkpoint preservado para retomar");
    if (result.has_more && (!result.next_page || result.next_page <= result.start_page)) {
      throw new Error("Checkpoint de produtos nao avancou");
    }
    more = result.has_more;
  }
  sessionStorage.removeItem(key);
}

export async function runOrderItemBatches(progress: (message: string) => void) {
  const key = "bling-order-items-cursor";
  const ownerKey = "bling-order-items-operation";
  const operation = sessionStorage.getItem(ownerKey) ?? crypto.randomUUID();
  sessionStorage.setItem(ownerKey, operation);
  let cursor = sessionStorage.getItem(key);
  let more = true;
  while (more) {
    const res = await fetch("/api/integrations/backfill-order-items", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 100, after_external_id: cursor, operation_id: operation }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}; cursor preservado`);
    const result = await res.json();
    progress(`Itens: ${result.items_created} criados; ${result.remaining_without_items} pedidos sem itens; ${result.unknown_products} produtos desconhecidos; ${result.not_found} ausentes; ${result.detail_without_items} detalhes vazios`);
    invalidateProductSales();
    if (result.failed) throw new Error("Falha em pedidos; retome para tentar o mesmo lote");
    if (result.has_more && (!result.next_cursor || result.next_cursor === cursor)) throw new Error("Cursor nao avancou");
    cursor = result.next_cursor;
    if (cursor) sessionStorage.setItem(key, cursor);
    more = result.has_more;
  }
  sessionStorage.removeItem(key);
  sessionStorage.removeItem(ownerKey);
}
