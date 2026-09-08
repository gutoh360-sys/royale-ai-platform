-- ============================================================
-- AUDITORIA /analytics/products — READ-ONLY
-- Executar no terminal do backend via:
--   python -c "
--     import asyncio
--     from backend.core.di import get_db_session_factory
--     async def run():
--         factory = get_db_session_factory()
--         async with factory() as session:
--             result = await session.execute(open('backend/scripts/audit_analytics_products.sql').read())
--             for row in result: print(row)
--     asyncio.run(run())
--   "
--
-- OU via psql diretamente se acesso disponível.
-- Nenhuma dessas consultas modifica dados.
-- ============================================================

-- ============================================================
-- 1. STATUS EM PRODUÇÃO
-- ============================================================
SELECT
  o.status,
  COUNT(*) AS qtd_orders,
  SUM(o.total_amount) AS sum_total_amount
FROM operational.orders o
GROUP BY o.status
ORDER BY o.status;

-- ============================================================
-- 2. RECEITA DOS ITENS POR STATUS DO PEDIDO
-- ============================================================
SELECT
  o.status,
  COUNT(DISTINCT o.id) AS qtd_orders,
  COUNT(oi.id) AS qtd_items,
  SUM(oi.total_price) AS sum_items_total_price
FROM operational.orders o
JOIN operational.order_items oi ON oi.order_id = o.id
GROUP BY o.status
ORDER BY o.status;

-- ============================================================
-- 3. INTEGRIDADE ORDERITEM.TOTAL_PRICE
-- Regra: total_price ≈ unit_price * quantity - discount
-- OrderItem NÃO tem campo discount.
-- Verificar contra model real.
-- ============================================================
SELECT
  'TOTAL_ITEMS' AS metric,
  COUNT(*) AS value
FROM operational.order_items
UNION ALL
SELECT
  'CONSISTENTES',
  COUNT(*)
FROM operational.order_items
WHERE ABS(total_price - (unit_price * quantity)) < 0.01
UNION ALL
SELECT
  'DIVERGENTES',
  COUNT(*)
FROM operational.order_items
WHERE ABS(total_price - (unit_price * quantity)) >= 0.01
UNION ALL
SELECT
  'VALOR_TOTAL_DIVERGENTE',
  COALESCE(SUM(ABS(total_price - (unit_price * quantity))), 0)
FROM operational.order_items
WHERE ABS(total_price - (unit_price * quantity)) >= 0.01;

-- Exemplos de divergência (sem PII)
SELECT
  oi.id AS order_item_id,
  oi.quantity,
  oi.unit_price,
  oi.total_price,
  (oi.unit_price * oi.quantity) AS expected_total,
  (oi.total_price - (oi.unit_price * oi.quantity)) AS diff
FROM operational.order_items oi
WHERE ABS(oi.total_price - (oi.unit_price * oi.quantity)) >= 0.01
ORDER BY ABS(oi.total_price - (oi.unit_price * oi.quantity)) DESC
LIMIT 10;

-- ============================================================
-- 4. VÍNCULO ITEM → PRODUCT
-- ============================================================
SELECT
  'TOTAL_ORDER_ITEMS' AS metric,
  COUNT(*) AS value
FROM operational.order_items
UNION ALL
SELECT
  'COM_PRODUCT_ID',
  COUNT(*)
FROM operational.order_items
WHERE product_id IS NOT NULL
UNION ALL
SELECT
  'SEM_PRODUCT_ID',
  COUNT(*)
FROM operational.order_items
WHERE product_id IS NULL
UNION ALL
SELECT
  'RECEITA_ITENS_COM_PRODUCT',
  COALESCE(SUM(total_price), 0)
FROM operational.order_items
WHERE product_id IS NOT NULL
UNION ALL
SELECT
  'RECEITA_ITENS_SEM_PRODUCT',
  COALESCE(SUM(total_price), 0)
FROM operational.order_items
WHERE product_id IS NULL;

-- ============================================================
-- 5. RECONCILIAÇÃO COMPLETA
-- ============================================================
SELECT
  'SUM(orders.total_amount)' AS metric,
  SUM(total_amount) AS value
FROM operational.orders
UNION ALL
SELECT
  'SUM(order_items.total_price)',
  SUM(total_price)
FROM operational.order_items
UNION ALL
SELECT
  'SUM(order_items.total_price com product_id)',
  SUM(total_price)
FROM operational.order_items
WHERE product_id IS NOT NULL
UNION ALL
SELECT
  'SUM(order_items.total_price sem product_id)',
  SUM(total_price)
FROM operational.order_items
WHERE product_id IS NULL
UNION ALL
SELECT
  'SUM(orders.shipping_amount)',
  COALESCE(SUM(shipping_amount), 0)
FROM operational.orders
UNION ALL
SELECT
  'SUM(orders.discount_amount)',
  COALESCE(SUM(discount_amount), 0)
FROM operational.orders;

-- Reconciliação por status (sem subqueries perigosas)
SELECT
  o.status,
  SUM(o.total_amount) AS order_total,
  SUM(oi.total_price) AS item_total,
  SUM(o.shipping_amount) AS shipping,
  SUM(o.discount_amount) AS discount,
  COUNT(DISTINCT o.id) AS orders,
  COUNT(oi.id) AS items
FROM operational.orders o
LEFT JOIN operational.order_items oi ON oi.order_id = o.id
GROUP BY o.status
ORDER BY o.status;
