cd /app && PYTHONPATH=/app python - <<'PY'
import os, asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def run():
    url = os.environ["DATABASE_URL"]
    engine = create_async_engine(url)
    async with engine.connect() as conn:

        # ==========================================================
        # 1. ORDERS POR STATUS
        # Query direta na tabela orders, sem join com items.
        # ==========================================================
        print("\n=== 1. ORDERS POR STATUS ===")
        r = await conn.execute(text("""
            SELECT status, COUNT(*) AS qtd, SUM(total_amount) AS total
            FROM operational.orders
            GROUP BY status ORDER BY status
        """))
        for row in r.fetchall():
            print(f"  {row[0]:15s} | {row[1]:>6d} | R$ {float(row[2]):>12.2f}")

        # ==========================================================
        # 2. ORDER ITEMS POR STATUS
        # Agregacao de items, com distinct de orders.
        # ==========================================================
        print("\n=== 2. ORDER ITEMS POR STATUS ===")
        r = await conn.execute(text("""
            SELECT o.status,
                   COUNT(DISTINCT o.id) AS orders,
                   COUNT(oi.id) AS items,
                   SUM(oi.total_price) AS revenue
            FROM operational.order_items oi
            JOIN operational.orders o ON oi.order_id = o.id
            GROUP BY o.status ORDER BY o.status
        """))
        for row in r.fetchall():
            print(f"  {row[0]:15s} | orders={row[1]:>5d} | items={row[2]:>6d} | R$ {float(row[3]):>12.2f}")

        # ==========================================================
        # 3. TOTAL_PRICE VS UNIT*QUANTITY
        # OrderItem nao tem coluna discount.
        # Diferenca pode ser desconto legitimo do Bling.
        # ==========================================================
        print("\n=== 3. TOTAL_PRICE VS UNIT*QUANTITY ===")
        r = await conn.execute(text("""
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN ABS(total_price - (unit_price * quantity)) < 0.01 THEN 1 ELSE 0 END) AS iguais,
                SUM(CASE WHEN ABS(total_price - (unit_price * quantity)) >= 0.01 THEN 1 ELSE 0 END) AS com_diferenca,
                COALESCE(SUM(ABS(total_price - (unit_price * quantity))), 0) AS valor_abs_diferencas
            FROM operational.order_items
        """))
        row = r.fetchone()
        print(f"  TOTAL_ITEMS:              {row[0]}")
        print(f"  IGUAIS_A_UNIT_X_QTY:      {row[1]}")
        print(f"  COM_DIFERENCA:            {row[2]}")
        print(f"  VALOR_ABSOLUTO_DIFERENCAS: R$ {float(row[3]):.2f}")
        print("\n  Top 10 diferencas:")
        r = await conn.execute(text("""
            SELECT oi.id, oi.quantity, oi.unit_price, oi.total_price,
                   (oi.unit_price * oi.quantity) AS expected_without_discount,
                   (oi.total_price - (oi.unit_price * oi.quantity)) AS difference
            FROM operational.order_items oi
            WHERE ABS(oi.total_price - (oi.unit_price * oi.quantity)) >= 0.01
            ORDER BY ABS(oi.total_price - (oi.unit_price * oi.quantity)) DESC
            LIMIT 10
        """))
        for row in r.fetchall():
            print(f"    id={row[0]}  qty={row[1]}  unit={float(row[2]):.2f}  total={float(row[3]):.2f}  expected={float(row[4]):.2f}  diff={float(row[5]):.2f}")

        # ==========================================================
        # 4. VINCULO ITEM -> PRODUCT
        # product_id e NOT NULL. Sempre hara valor 0 em SEM_PRODUCT_ID.
        # Mostramos para confirmar integridade referencial.
        # ==========================================================
        print("\n=== 4. VINCULO ITEM -> PRODUCT ===")
        r = await conn.execute(text("""
            SELECT COUNT(*) AS total,
                SUM(CASE WHEN product_id IS NOT NULL THEN 1 ELSE 0 END) AS com,
                SUM(CASE WHEN product_id IS NULL THEN 1 ELSE 0 END) AS sem,
                SUM(CASE WHEN product_id IS NOT NULL THEN total_price ELSE 0 END) AS receita_com,
                SUM(CASE WHEN product_id IS NULL THEN total_price ELSE 0 END) AS receita_sem
            FROM operational.order_items
        """))
        row = r.fetchone()
        print(f"  TOTAL_ORDER_ITEMS:          {row[0]}")
        print(f"  COM_PRODUCT_ID:             {row[1]}")
        print(f"  SEM_PRODUCT_ID:             {row[2]}")
        print(f"  RECEITA_ITENS_COM_PRODUCT:  R$ {float(row[3]):.2f}")
        print(f"  RECEITA_ITENS_SEM_PRODUCT:  R$ {float(row[4]):.2f}")

        # ==========================================================
        # 5. RECONCILIACAO CORRETA
        # Totais de orders calculados SEM JOIN multiplicador.
        # Totais de items calculados separadamente.
        # ==========================================================
        print("\n=== 5. RECONCILIACAO ===")
        r = await conn.execute(text("""
            WITH order_totals AS (
                SELECT
                    SUM(total_amount) AS total_amount,
                    SUM(COALESCE(shipping_amount, 0)) AS shipping,
                    SUM(COALESCE(discount_amount, 0)) AS discount,
                    COUNT(*) AS orders
                FROM operational.orders
            ),
            item_totals AS (
                SELECT
                    SUM(total_price) AS total_price,
                    SUM(CASE WHEN product_id IS NOT NULL THEN total_price ELSE 0 END) AS com_product,
                    SUM(CASE WHEN product_id IS NULL THEN total_price ELSE 0 END) AS sem_product,
                    COUNT(*) AS items
                FROM operational.order_items
            )
            SELECT
                ot.orders, ot.total_amount, ot.shipping, ot.discount,
                it.items, it.total_price, it.com_product, it.sem_product
            FROM order_totals ot, item_totals it
        """))
        row = r.fetchone()
        print(f"  Orders:                          {row[0]}")
        print(f"  SUM(orders.total_amount):        R$ {float(row[1]):>12.2f}")
        print(f"  SUM(orders.shipping_amount):     R$ {float(row[2]):>12.2f}")
        print(f"  SUM(orders.discount_amount):     R$ {float(row[3]):>12.2f}")
        print(f"  Items:                           {row[4]}")
        print(f"  SUM(order_items.total_price):    R$ {float(row[5]):>12.2f}")
        print(f"  SUM(items c/ product_id):        R$ {float(row[6]):>12.2f}")
        print(f"  SUM(items s/ product_id):        R$ {float(row[7]):>12.2f}")

        # ==========================================================
        # 6. RECONCILIACAO POR STATUS
        # Cada status: orders agregados + items agregados.
        # NAO usa join que duplica orders.
        # ==========================================================
        print("\n=== 6. RECONCILIACAO POR STATUS ===")
        r = await conn.execute(text("""
            WITH order_status AS (
                SELECT status,
                       COUNT(*) AS orders,
                       SUM(total_amount) AS order_total
                FROM operational.orders
                GROUP BY status
            ),
            item_status AS (
                SELECT o.status,
                       COUNT(oi.id) AS items,
                       SUM(oi.total_price) AS item_total
                FROM operational.order_items oi
                JOIN operational.orders o ON oi.order_id = o.id
                GROUP BY o.status
            )
            SELECT
                os.status,
                os.orders,
                COALESCE(is2.items, 0) AS items,
                os.order_total,
                COALESCE(is2.item_total, 0) AS item_total
            FROM order_status os
            LEFT JOIN item_status is2 ON is2.status = os.status
            ORDER BY os.status
        """))
        for row in r.fetchall():
            print(f"  {row[0]:15s} | ord={row[1]:>5d} | itm={row[2]:>5d} | order_total=R${float(row[3]):>10.2f} | item_total=R${float(row[4]):>10.2f}")

        # ==========================================================
        # 7. CANCELLED
        # ==========================================================
        print("\n=== 7. CANCELLED ===")
        r = await conn.execute(text("""
            WITH c_orders AS (
                SELECT COUNT(*) AS orders, COALESCE(SUM(total_amount), 0) AS total
                FROM operational.orders WHERE status = 'cancelled'
            ),
            c_items AS (
                SELECT COUNT(*) AS items, COALESCE(SUM(oi.total_price), 0) AS total
                FROM operational.order_items oi
                JOIN operational.orders o ON oi.order_id = o.id
                WHERE o.status = 'cancelled'
            )
            SELECT co.orders, co.total, ci.items, ci.total
            FROM c_orders co, c_items ci
        """))
        row = r.fetchone()
        print(f"  Cancelled orders:       {row[0]}")
        print(f"  Cancelled order total:  R$ {float(row[1]):.2f}")
        print(f"  Cancelled items:        {row[2]}")
        print(f"  Cancelled item total:   R$ {float(row[3]):.2f}")

        # ==========================================================
        # 8. ITENS SKIPADOS (sync_errors)
        # Itens que nao encontraram Product sao registrados em
        # sync_errors com error_type = 'order_item_unknown_product'.
        # ==========================================================
        print("\n=== 8. SYNC ERRORS: ITEM SEM PRODUCT ===")
        r = await conn.execute(text("""
            SELECT COUNT(*) AS total_erros
            FROM operational.sync_errors
            WHERE error_type = 'order_item_unknown_product'
        """))
        row = r.fetchone()
        print(f"  Total erros 'order_item_unknown_product': {row[0]}")

        if row[0] and row[0] > 0:
            print("\n  Ultimos 10 erros:")
            r = await conn.execute(text("""
                SELECT id, external_id, error_message
                FROM operational.sync_errors
                WHERE error_type = 'order_item_unknown_product'
                ORDER BY created_at DESC
                LIMIT 10
            """))
            for row in r.fetchall():
                print(f"    sync_error_id={row[0]}  ext_id={row[1]}  msg={row[2]}")

    await engine.dispose()

asyncio.run(run())
PY
