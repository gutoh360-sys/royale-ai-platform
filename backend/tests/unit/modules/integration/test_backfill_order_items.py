"""Tests for backfill_order_items and sync_orders detail-fetch logic.

A-K test coverage:
A: backfill enriches order without items from Bling detail
B: backfill skips order that already has items
C: backfill handles Bling 404 gracefully
D: backfill handles detail response with empty items list
E: backfill handles unknown product in items (records error, continues)
F: backfill isolates per-order failures (one exception doesn't abort batch)
G: backfill cursor-based pagination (has_more + next_cursor)
H: backfill idempotent (second run with same data → no duplicates)
I: sync_orders now fetches detail for orders without items
J: sync_orders skips detail fetch when list response already has items
K: find_orders_without_items query correctness
"""

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

import httpx
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config.base import Settings
from backend.database.models.category import Category
from backend.database.models.order import Order, OrderItem
from backend.database.models.product import Product
from backend.database.models.sync import SyncError
from backend.modules.integration.client import BlingApiClient
from backend.modules.integration.sync_repository import (
    PostgresSyncLogRepository,
    SyncDataRepository,
)
from backend.modules.integration.sync_service import BlingSyncService


async def _token_provider() -> str:
    return "token"


def _make_client(
    settings: Settings,
    handler: Any,
) -> BlingApiClient:
    transport = httpx.MockTransport(handler)
    http = httpx.AsyncClient(transport=transport, timeout=httpx.Timeout(1.0))
    return BlingApiClient(settings, client=http)


async def _make_service(
    session: AsyncSession,
    client: BlingApiClient,
    settings: Settings,
) -> BlingSyncService:
    return BlingSyncService(
        client=client,
        token_provider=_token_provider,
        sync_log_repo=PostgresSyncLogRepository(session),
        data_repo=SyncDataRepository(session),
        settings=settings,
    )


async def _seed_product(session: AsyncSession, sku: str, bling_id: str = "1") -> Product:
    """Seed a product + category for item resolution."""
    category = Category(bling_id="cat-test", name="Test Category")
    session.add(category)
    await session.flush()
    product = Product(bling_id=bling_id, sku=sku, name=f"Product {sku}", category_id=category.id)
    session.add(product)
    await session.flush()
    return product


def _backfill_items_client(
    settings: Settings,
    order_detail_responses: dict[str, dict[str, Any] | None],
) -> BlingApiClient:
    """Client for backfill_order_items: serves GET /pedidos/vendas/{id}."""

    def handler(request: httpx.Request) -> httpx.Response:
        prefix = "/Api/v3/pedidos/vendas/"
        if request.url.path.startswith(prefix):
            eid = request.url.path[len(prefix):]
            if eid in order_detail_responses:
                data = order_detail_responses[eid]
                if data is None:
                    return httpx.Response(404, json={"error": {"message": "not found"}})
                return httpx.Response(200, json={"data": data})
        return httpx.Response(404, json={"error": {"message": "not found"}})

    transport = httpx.MockTransport(handler)
    http = httpx.AsyncClient(transport=transport, timeout=httpx.Timeout(1.0))
    return BlingApiClient(settings, client=http)


def _sync_items_client(
    settings: Settings,
    list_payload: dict[str, Any],
    detail_responses: dict[str, dict[str, Any] | None] | None = None,
) -> BlingApiClient:
    """Client for sync_orders: serves list endpoint + optional detail endpoint.

    The list endpoint returns orders (typically without itens).
    The detail endpoint returns full order with itens.
    """
    detail_responses = detail_responses or {}

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/Api/v3/pedidos/vendas":
            return httpx.Response(200, json=list_payload)
        prefix = "/Api/v3/pedidos/vendas/"
        if request.url.path.startswith(prefix):
            eid = request.url.path[len(prefix):]
            if eid in detail_responses:
                data = detail_responses[eid]
                if data is None:
                    return httpx.Response(404, json={"error": {"message": "not found"}})
                return httpx.Response(200, json={"data": data})
        return httpx.Response(404, json={"error": {"message": "not found"}})

    transport = httpx.MockTransport(handler)
    http = httpx.AsyncClient(transport=transport, timeout=httpx.Timeout(1.0))
    return BlingApiClient(settings, client=http)


# --- A: backfill enriches order without items from Bling detail ---


async def test_backfill_items_enriches_order_without_items(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    """A: Order with 0 items → Bling detail has items → items created."""
    await _seed_product(db_session, "SKU-A1", bling_id="100")
    await db_session.commit()

    order = Order(
        id=uuid4(),
        external_id="8001",
        marketplace="bling",
        order_number="6001",
        customer_name="Cliente A",
        ordered_at=datetime(2026, 9, 1, 10, 0, 0, tzinfo=UTC),
    )
    db_session.add(order)
    await db_session.flush()

    detail_responses = {
        "8001": {
            "id": 8001,
            "numero": "6001",
            "contato": {"nome": "Cliente A"},
            "total": {"valor": 200.0},
            "itens": [
                {"codigo": "SKU-A1", "quantidade": 2, "valor": 100.0},
            ],
        },
    }
    client = _backfill_items_client(settings, detail_responses)
    service = await _make_service(db_session, client, settings)
    result = await service.backfill_order_items(limit=50)
    await db_session.commit()

    assert result.selected == 1
    assert result.processed == 1
    assert result.orders_enriched == 1
    assert result.items_created == 1
    assert result.not_found == 0
    assert result.detail_without_items == 0
    assert result.failed == 0
    assert result.has_more is False

    order = await db_session.scalar(select(Order).where(Order.external_id == "8001"))
    assert order is not None
    assert len(order.items) == 1
    assert order.items[0].sku == "SKU-A1"
    assert order.items[0].quantity == 2
    assert order.items[0].unit_price == 100.0


# --- B: backfill skips order that already has items ---


async def test_backfill_items_skips_order_with_existing_items(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    """B: Order already has items → not selected by find_orders_without_items."""
    product = await _seed_product(db_session, "SKU-B1", bling_id="200")
    await db_session.commit()

    order = Order(
        id=uuid4(),
        external_id="8002",
        marketplace="bling",
        order_number="6002",
        customer_name="Cliente B",
        ordered_at=datetime(2026, 9, 1, 11, 0, 0, tzinfo=UTC),
    )
    db_session.add(order)
    await db_session.flush()

    item = OrderItem(
        order_id=order.id,
        product_id=product.id,
        sku="SKU-B1",
        name="Product B1",
        quantity=1,
        unit_price=50.0,
        total_price=50.0,
    )
    db_session.add(item)
    await db_session.flush()
    await db_session.commit()

    detail_responses = {
        "8002": {
            "id": 8002,
            "itens": [{"codigo": "SKU-B1", "quantidade": 3, "valor": 50.0}],
        },
    }
    client = _backfill_items_client(settings, detail_responses)
    service = await _make_service(db_session, client, settings)
    result = await service.backfill_order_items(limit=50)
    await db_session.commit()

    assert result.selected == 0
    assert result.processed == 0


# --- C: backfill handles Bling 404 gracefully ---


async def test_backfill_items_handles_404_gracefully(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    """C: Order without items, Bling returns 404 → counted as not_found."""
    order = Order(
        id=uuid4(),
        external_id="8003",
        marketplace="bling",
        order_number="6003",
        customer_name="Cliente C",
        ordered_at=datetime(2026, 9, 1, 12, 0, 0, tzinfo=UTC),
    )
    db_session.add(order)
    await db_session.flush()
    await db_session.commit()

    detail_responses = {
        "8003": None,
    }
    client = _backfill_items_client(settings, detail_responses)
    service = await _make_service(db_session, client, settings)
    result = await service.backfill_order_items(limit=50)
    await db_session.commit()

    assert result.selected == 1
    assert result.not_found == 1
    assert result.failed == 0
    assert result.items_created == 0

    order = await db_session.scalar(select(Order).where(Order.external_id == "8003"))
    assert order is not None
    assert len(order.items) == 0


# --- D: backfill handles detail response with empty items ---


async def test_backfill_items_handles_empty_items_in_detail(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    """D: Order without items, Bling detail returns empty itens → counted."""
    order = Order(
        id=uuid4(),
        external_id="8004",
        marketplace="bling",
        order_number="6004",
        customer_name="Cliente D",
        ordered_at=datetime(2026, 9, 1, 13, 0, 0, tzinfo=UTC),
    )
    db_session.add(order)
    await db_session.flush()
    await db_session.commit()

    detail_responses = {
        "8004": {
            "id": 8004,
            "itens": [],
        },
    }
    client = _backfill_items_client(settings, detail_responses)
    service = await _make_service(db_session, client, settings)
    result = await service.backfill_order_items(limit=50)
    await db_session.commit()

    assert result.selected == 1
    assert result.detail_without_items == 1
    assert result.items_created == 0


# --- E: backfill handles unknown product in items ---


async def test_backfill_items_unknown_product_records_error(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    """E: Item with unknown SKU → order kept, error recorded, other items succeed."""
    await _seed_product(db_session, "SKU-E1", bling_id="300")
    await db_session.commit()

    order = Order(
        id=uuid4(),
        external_id="8005",
        marketplace="bling",
        order_number="6005",
        customer_name="Cliente E",
        ordered_at=datetime(2026, 9, 1, 14, 0, 0, tzinfo=UTC),
    )
    db_session.add(order)
    await db_session.flush()

    detail_responses = {
        "8005": {
            "id": 8005,
            "itens": [
                {"codigo": "UNKNOWN-SKU", "quantidade": 1, "valor": 30.0},
                {"codigo": "SKU-E1", "quantidade": 2, "valor": 50.0},
            ],
        },
    }
    client = _backfill_items_client(settings, detail_responses)
    service = await _make_service(db_session, client, settings)
    result = await service.backfill_order_items(limit=50)
    await db_session.commit()

    assert result.processed == 1
    assert result.unknown_products >= 1

    error = await db_session.scalar(
        select(SyncError).where(SyncError.error_type == "order_item_unknown_product")
    )
    assert error is not None
    assert "UNKNOWN-SKU" in error.error_message

    order = await db_session.scalar(select(Order).where(Order.external_id == "8005"))
    assert order is not None
    assert len(order.items) == 1
    assert order.items[0].sku == "SKU-E1"


# --- F: backfill isolates per-order failures ---


async def test_backfill_items_isolates_order_failures(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    """F: One order's API call throws → other orders still processed."""
    await _seed_product(db_session, "SKU-F1", bling_id="400")
    await db_session.commit()

    for eid in ["8006", "8007", "8008"]:
        order = Order(
            id=uuid4(),
            external_id=eid,
            marketplace="bling",
            order_number=f"60{eid[-2:]}",
            customer_name=f"Cliente {eid}",
            ordered_at=datetime(2026, 9, 1, 15, 0, 0, tzinfo=UTC),
        )
        db_session.add(order)
    await db_session.flush()
    await db_session.commit()

    def handler(request: httpx.Request) -> httpx.Response:
        prefix = "/Api/v3/pedidos/vendas/"
        if request.url.path.startswith(prefix):
            eid = request.url.path[len(prefix):]
            if eid == "8006":
                raise httpx.ConnectError("connection refused")
            if eid == "8007":
                return httpx.Response(200, json={
                    "data": {
                        "id": 8007,
                        "itens": [{"codigo": "SKU-F1", "quantidade": 1, "valor": 50.0}],
                    }
                })
            if eid == "8008":
                return httpx.Response(200, json={
                    "data": {"id": 8008, "itens": []}
                })
        return httpx.Response(404, json={"error": {"message": "not found"}})

    client = _backfill_items_client(settings, {})
    # Replace transport with custom one
    transport = httpx.MockTransport(handler)
    client._client = httpx.AsyncClient(transport=transport, timeout=httpx.Timeout(1.0))

    service = await _make_service(db_session, client, settings)
    result = await service.backfill_order_items(limit=50)
    await db_session.commit()

    assert result.failed == 1
    assert result.detail_without_items == 1
    assert result.items_created == 1
    assert result.processed == 2

    order_8007 = await db_session.scalar(
        select(Order).where(Order.external_id == "8007")
    )
    assert order_8007 is not None
    assert len(order_8007.items) == 1


# --- G: backfill cursor-based pagination ---


async def test_backfill_items_cursor_pagination(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    """G: With limit=1, returns has_more + next_cursor for second call."""
    await _seed_product(db_session, "SKU-G1", bling_id="500")
    await db_session.commit()

    for i, eid in enumerate(["8009", "8010", "8011"]):
        order = Order(
            id=uuid4(),
            external_id=eid,
            marketplace="bling",
            order_number=f"6{eid[-3:]}",
            customer_name=f"Cliente {eid}",
            ordered_at=datetime(2026, 9, 1 + i, 10, 0, 0, tzinfo=UTC),
        )
        db_session.add(order)
    await db_session.flush()
    await db_session.commit()

    detail_responses = {
        "8009": {
            "id": 8009,
            "itens": [{"codigo": "SKU-G1", "quantidade": 1, "valor": 10.0}],
        },
        "8010": {
            "id": 8010,
            "itens": [{"codigo": "SKU-G1", "quantidade": 2, "valor": 10.0}],
        },
        "8011": {
            "id": 8011,
            "itens": [{"codigo": "SKU-G1", "quantidade": 3, "valor": 10.0}],
        },
    }
    client = _backfill_items_client(settings, detail_responses)
    service = await _make_service(db_session, client, settings)

    # Page 1
    r1 = await service.backfill_order_items(limit=1)
    await db_session.commit()
    assert r1.selected == 1
    assert r1.has_more is True
    assert r1.next_cursor is not None
    cursor = r1.next_cursor

    # Page 2
    r2 = await service.backfill_order_items(limit=1, after_external_id=cursor)
    await db_session.commit()
    assert r2.selected == 1
    assert r2.has_more is True
    cursor2 = r2.next_cursor

    # Page 3
    r3 = await service.backfill_order_items(limit=1, after_external_id=cursor2)
    await db_session.commit()
    assert r3.selected == 1
    assert r3.has_more is False

    # Page 4 (empty)
    r4 = await service.backfill_order_items(limit=1, after_external_id=r3.next_cursor)
    assert r4.selected == 0
    assert r4.has_more is False

    # Verify all 3 orders enriched
    items_count = await db_session.scalar(
        select(func.count(OrderItem.id))
    )
    assert items_count == 3


# --- H: backfill idempotent ---


async def test_backfill_items_idempotent_no_duplicates(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    """H: Running backfill twice with same data → no duplicate items."""
    await _seed_product(db_session, "SKU-H1", bling_id="600")
    await db_session.commit()

    order = Order(
        id=uuid4(),
        external_id="8012",
        marketplace="bling",
        order_number="6012",
        customer_name="Cliente H",
        ordered_at=datetime(2026, 9, 1, 16, 0, 0, tzinfo=UTC),
    )
    db_session.add(order)
    await db_session.flush()
    await db_session.commit()

    detail_responses = {
        "8012": {
            "id": 8012,
            "itens": [{"codigo": "SKU-H1", "quantidade": 2, "valor": 25.0}],
        },
    }
    client = _backfill_items_client(settings, detail_responses)
    service = await _make_service(db_session, client, settings)

    # First run
    r1 = await service.backfill_order_items(limit=50)
    await db_session.commit()
    assert r1.items_created == 1

    # Second run — order already has items, not selected
    r2 = await service.backfill_order_items(limit=50)
    await db_session.commit()
    assert r2.selected == 0
    assert r2.items_created == 0

    # Verify only 1 item exists
    items = (
        await db_session.execute(select(OrderItem).where(OrderItem.sku == "SKU-H1"))
    ).scalars().all()
    assert len(items) == 1


# --- I: sync_orders now fetches detail for orders without items ---


async def test_sync_orders_fetches_detail_for_empty_items(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    """I: sync_orders list endpoint returns no itens → fetches detail → items created."""
    await _seed_product(db_session, "SKU-I1", bling_id="700")
    await db_session.commit()

    list_payload = {
        "data": [
            {
                "id": 8013,
                "numero": "6013",
                "contato": {"nome": "Cliente I"},
                "total": {"valor": 100.0},
                # No "itens" field — simulates Bling list response
            }
        ],
        "response": {"paginacao": {"pagina": 1, "limite": 100, "totalPaginas": 1}},
    }

    detail_responses = {
        "8013": {
            "id": 8013,
            "numero": "6013",
            "contato": {"nome": "Cliente I"},
            "total": {"valor": 100.0},
            "itens": [
                {"codigo": "SKU-I1", "quantidade": 1, "valor": 100.0},
            ],
        },
    }

    client = _sync_items_client(settings, list_payload, detail_responses)
    service = await _make_service(db_session, client, settings)
    result = await service.sync_orders()
    await db_session.commit()

    assert result.status == "completed"
    assert result.items_created == 1

    order = await db_session.scalar(select(Order).where(Order.external_id == "8013"))
    assert order is not None
    assert len(order.items) == 1
    assert order.items[0].sku == "SKU-I1"


# --- J: sync_orders skips detail fetch when items exist ---


async def test_sync_orders_skips_detail_when_items_exist(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    """J: sync_orders list endpoint returns itens → does NOT call detail endpoint."""
    await _seed_product(db_session, "SKU-J1", bling_id="800")
    await db_session.commit()

    detail_call_count = 0

    list_payload = {
        "data": [
            {
                "id": 8014,
                "numero": "6014",
                "contato": {"nome": "Cliente J"},
                "total": {"valor": 75.0},
                "itens": [{"codigo": "SKU-J1", "quantidade": 1, "valor": 75.0}],
            }
        ],
        "response": {"paginacao": {"pagina": 1, "limite": 100, "totalPaginas": 1}},
    }

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal detail_call_count
        if request.url.path == "/Api/v3/pedidos/vendas":
            return httpx.Response(200, json=list_payload)
        prefix = "/Api/v3/pedidos/vendas/"
        if request.url.path.startswith(prefix):
            detail_call_count += 1
        return httpx.Response(404, json={"error": {"message": "not found"}})

    transport = httpx.MockTransport(handler)
    http = httpx.AsyncClient(transport=transport, timeout=httpx.Timeout(1.0))
    client = BlingApiClient(settings, client=http)

    service = await _make_service(db_session, client, settings)
    result = await service.sync_orders()
    await db_session.commit()

    assert result.status == "completed"
    assert result.items_created == 1
    assert detail_call_count == 0

    order = await db_session.scalar(select(Order).where(Order.external_id == "8014"))
    assert order is not None
    assert len(order.items) == 1


# --- K: find_orders_without_items query correctness ---


async def test_find_orders_without_items_query(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    """K: find_orders_without_items returns only orders with 0 items."""
    product = await _seed_product(db_session, "SKU-K1", bling_id="900")
    await db_session.commit()

    order_no_items = Order(
        id=uuid4(),
        external_id="8015",
        marketplace="bling",
        order_number="6015",
        customer_name="No Items",
        ordered_at=datetime(2026, 9, 1, 17, 0, 0, tzinfo=UTC),
    )
    order_with_items = Order(
        id=uuid4(),
        external_id="8016",
        marketplace="bling",
        order_number="6016",
        customer_name="Has Items",
        ordered_at=datetime(2026, 9, 1, 18, 0, 0, tzinfo=UTC),
    )
    db_session.add_all([order_no_items, order_with_items])
    await db_session.flush()

    item = OrderItem(
        order_id=order_with_items.id,
        product_id=product.id,
        sku="SKU-K1",
        name="Product K1",
        quantity=1,
        unit_price=40.0,
        total_price=40.0,
    )
    db_session.add(item)
    await db_session.flush()
    await db_session.commit()

    data_repo = SyncDataRepository(db_session)
    orders = await data_repo.find_orders_without_items(limit=50)

    assert len(orders) == 1
    assert orders[0].external_id == "8015"


async def test_find_orders_without_items_cursor_pagination(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    """K2: Cursor pagination returns correct subset."""
    for i, eid in enumerate(["8017", "8018", "8019"]):
        order = Order(
            id=uuid4(),
            external_id=eid,
            marketplace="bling",
            order_number=f"6{eid[-3:]}",
            customer_name=f"Cursor {eid}",
            ordered_at=datetime(2026, 9, 1 + i, 10, 0, 0, tzinfo=UTC),
        )
        db_session.add(order)
    await db_session.flush()
    await db_session.commit()

    data_repo = SyncDataRepository(db_session)

    # Page 1: limit 2
    page1 = await data_repo.find_orders_without_items(limit=2)
    assert len(page1) == 2
    assert page1[0].external_id == "8017"
    assert page1[1].external_id == "8018"

    # Page 2: cursor from page 1
    page2 = await data_repo.find_orders_without_items(
        limit=2, after_external_id=page1[-1].external_id
    )
    assert len(page2) == 1
    assert page2[0].external_id == "8019"

    # Page 3: empty
    page3 = await data_repo.find_orders_without_items(
        limit=2, after_external_id=page2[-1].external_id
    )
    assert len(page3) == 0
