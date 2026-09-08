"""READ-ONLY diagnostic: inspect Bling detail response structure for first candidate.

Run from backend directory:
    python -m scripts.diagnose_bling_detail

DOES NOT modify database. DOES NOT print PII.
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.core.config.base import get_settings
from backend.modules.integration.client import BlingApiClient
from backend.modules.integration.service import get_bling_token_provider


async def main() -> None:
    settings = get_settings()
    token_provider = get_bling_token_provider(settings)
    client = BlingApiClient(settings)

    # First, get the first order without items from DB
    from sqlalchemy import select
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
    from backend.database.models.order import Order, OrderItem
    from backend.database.base import Base

    engine = create_async_engine(settings.DATABASE_URL)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        stmt = (
            select(Order)
            .where(
                ~select(OrderItem.id)
                .where(OrderItem.order_id == Order.id)
                .correlate(Order)
                .exists()
            )
            .order_by(Order.ordered_at, Order.external_id)
            .limit(1)
        )
        result = await session.execute(stmt)
        order = result.scalars().first()

        if order is None:
            print("NO_CANDIDATES_FOUND")
            await engine.dispose()
            return

        external_id = order.external_id
        print(f"external_id: {external_id}")

    # Fetch from Bling
    try:
        raw = await client.fetch_order(token_provider, order_id=external_id)
    except Exception as exc:
        print(f"FETCH_ERROR: {type(exc).__name__}: {exc}")
        await engine.dispose()
        return

    print(f"fetch_order_return_type: {type(raw).__name__}")
    print(f"fetch_order_is_none: {raw is None}")

    if raw is None:
        print("RESULT: fetch_order returned None (404 or non-dict data)")
        await engine.dispose()
        return

    print(f"TOP_LEVEL_KEYS: {sorted(raw.keys())}")

    # Check itens at top level
    itens_top = raw.get("itens")
    print(f"TOP_LEVEL_HAS_ITENS: {'itens' in raw}")
    print(f"TOP_LEVEL_ITENS_TYPE: {type(itens_top).__name__}")
    if isinstance(itens_top, list):
        print(f"TOP_LEVEL_ITENS_COUNT: {len(itens_top)}")

    # Check if there's a nested "data" wrapper
    if "data" in raw:
        nested = raw.get("data")
        print(f"NESTED_DATA_TYPE: {type(nested).__name__}")
        if isinstance(nested, dict):
            print(f"NESTED_DATA_KEYS: {sorted(nested.keys())}")
            nested_itens = nested.get("itens")
            print(f"NESTED_DATA_HAS_ITENS: {'itens' in nested}")
            if isinstance(nested_itens, list):
                print(f"NESTED_DATA_ITENS_COUNT: {len(nested_itens)}")

    # Summary of what backfill_order_items would see
    itens_backfill = raw.get("itens") or []
    print(f"BACKFILL_SEES_ITENS: {isinstance(itens_backfill, list)}")
    print(f"BACKFILL_ITENS_COUNT: {len(itens_backfill) if isinstance(itens_backfill, list) else 0}")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
