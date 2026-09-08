import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://royale:royale_dev_password@localhost:5432/royale_platform"

async def main():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async with AsyncSession(engine) as session:
        print("=" * 80)
        print("1) ORDERS: id, external_id, channel_id")
        print("=" * 80)
        result = await session.execute(text("SELECT id, external_id, channel_id FROM operational.orders LIMIT 10"))
        rows = result.fetchall()
        if not rows:
            print("  (no rows found)")
        else:
            print(f"  {'ID':<12} {'EXTERNAL_ID':<30} {'CHANNEL_ID':<12}")
            print(f"  {'-'*12} {'-'*30} {'-'*12}")
            for r in rows:
                print(f"  {str(r[0]):<12} {str(r[1]):<30} {str(r[2]):<12}")

        print()
        print("=" * 80)
        print("2) SALES CHANNELS: id, bling_id, name, tipo")
        print("=" * 80)
        result = await session.execute(text("SELECT id, bling_id, name, tipo FROM operational.sales_channels"))
        rows = result.fetchall()
        if not rows:
            print("  (no rows found)")
        else:
            print(f"  {'ID':<12} {'BLING_ID':<12} {'NAME':<40} {'TIPO':<20}")
            print(f"  {'-'*12} {'-'*12} {'-'*40} {'-'*20}")
            for r in rows:
                print(f"  {str(r[0]):<12} {str(r[1]):<12} {str(r[2]):<40} {str(r[3]):<20}")

        print()
        print("=" * 80)
        print("3) ORDERS JOINED WITH SALES CHANNELS")
        print("=" * 80)
        query = text("""
            SELECT o.id, o.external_id, o.channel_id, 
                   sc.name as channel_name, sc.bling_id, sc.tipo as channel_tipo
            FROM operational.orders o
            LEFT JOIN operational.sales_channels sc ON o.channel_id = sc.id
            LIMIT 10
        """)
        result = await session.execute(query)
        rows = result.fetchall()
        if not rows:
            print("  (no rows found)")
        else:
            print(f"  {'ORDER_ID':<12} {'EXTERNAL_ID':<30} {'CH_ID':<12} {'CHANNEL_NAME':<30} {'BLING_ID':<12} {'TIPO':<20}")
            print(f"  {'-'*12} {'-'*30} {'-'*12} {'-'*30} {'-'*12} {'-'*20}")
            for r in rows:
                print(f"  {str(r[0]):<12} {str(r[1]):<30} {str(r[2]):<12} {str(r[3]):<30} {str(r[4]):<12} {str(r[5]):<20}")

    await engine.dispose()

asyncio.run(main())
