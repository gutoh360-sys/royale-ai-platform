from contextlib import asynccontextmanager
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from backend.modules.integration.sync_service import BlingSyncService
from backend.tests.unit.modules.integration.test_product_checkpoint_ownership import checkpoint_repo


@asynccontextmanager
async def nested():
    yield


def make_service():
    repo = AsyncMock()
    repo.session = MagicMock()
    repo.session.begin_nested = nested
    repo.session.flush = AsyncMock()
    repo.find_order_item.return_value = None
    repo.find_product_by_sku.return_value = None
    repo.find_product_by_bling_id.return_value = None
    svc = BlingSyncService(AsyncMock(), AsyncMock(), AsyncMock(), repo, SimpleNamespace())
    svc._client.fetch_product.return_value = None
    return svc, repo


@pytest.mark.asyncio
async def test_exact_sku_precedes_bling_and_missing_detail_reuses_upsert():
    svc, repo = make_service()
    product = SimpleNamespace(id=uuid4(), sku="SKU", name="Product")
    order = SimpleNamespace(id=uuid4(), items=[])
    repo.find_product_by_sku.return_value = product
    await svc._upsert_order_item(
        order, {"codigo": "SKU", "produto": {"id": 99}, "quantidade": 2, "valor": 12}
    )
    repo.find_product_by_bling_id.assert_not_called()
    assert order.items[0].total_price == 24
    repo.find_product_by_sku.return_value = None
    repo.find_product_by_bling_id.side_effect = [None, product]
    svc._client.fetch_product.return_value = {"id": 99, "codigo": "SKU"}
    svc._upsert_product = AsyncMock()
    await svc._upsert_order_item(SimpleNamespace(id=uuid4(), items=[]), {"produto": {"id": 99}})
    svc._upsert_product.assert_awaited_once_with({"id": 99, "codigo": "SKU"})
    svc._client.fetch_product.assert_awaited_once()


@pytest.mark.asyncio
async def test_fallback_sku_is_idempotent():
    svc, repo = make_service()
    product = SimpleNamespace(id=uuid4(), sku="SKU", name="Product")
    existing = SimpleNamespace(quantity=1, unit_price=2)
    repo.find_product_by_bling_id.return_value = product
    repo.find_order_item.return_value = existing
    order = SimpleNamespace(id=uuid4(), items=[])
    await svc._upsert_order_item(order, {"produto": {"id": 99}, "quantidade": 2})
    assert existing.quantity == 2
    repo.session.add.assert_not_called()


@pytest.mark.asyncio
async def test_repeated_raw_item_creates_one_item_and_updates_total():
    svc, repo = make_service()
    order = SimpleNamespace(id=uuid4(), items=[])
    repo.find_product_by_sku.return_value = SimpleNamespace(id=uuid4(), sku="SKU", name="Product")
    repo.find_order_item.side_effect = lambda oid, sku: next(
        (i for i in order.items if i.sku == sku), None
    )
    raw = {"codigo": "SKU", "quantidade": 2, "valor": 12}
    await svc._upsert_order_items(order, [raw, raw])
    assert len(order.items) == 1
    assert order.items[0].total_price == 24
    await svc._upsert_order_items(order, [{**raw, "quantidade": 3}])
    assert len(order.items) == 1
    assert order.items[0].total_price == 36


@pytest.mark.asyncio
async def test_actual_backfill_counts_unknown_before_deferred_queue_is_drained():
    svc, repo = make_service()
    repo.find_orders_without_items.return_value = [
        SimpleNamespace(id=uuid4(), external_id="1", items=[])
    ]
    repo.count_orders_without_items.return_value = 1
    svc._client.fetch_order.return_value = {"itens": [{"codigo": "UNKNOWN"}]}
    result = await svc.backfill_order_items()
    assert result.unknown_products == 1
    assert result.remaining_without_items == 1
    assert not svc._deferred_item_errors


@pytest.mark.asyncio
async def test_actual_backfill_bounded_cursor_and_resume():
    svc, repo = make_service()
    orders = [SimpleNamespace(id=uuid4(), external_id=str(i), items=[]) for i in range(101)]
    repo.find_orders_without_items.return_value = orders
    repo.count_orders_without_items.return_value = 101
    svc._client.fetch_order.return_value = {"itens": []}
    first = await svc.backfill_order_items(limit=100)
    assert first.selected == 100 and first.has_more and first.next_cursor == f"id:{orders[99].id}"
    assert svc._client.fetch_order.await_count == 100
    repo.find_orders_without_items.return_value = orders[100:]
    second = await svc.backfill_order_items(limit=100, after_external_id=first.next_cursor)
    repo.find_orders_without_items.assert_awaited_with(
        limit=101, after_external_id=first.next_cursor
    )
    assert second.selected == 1 and not second.has_more
    with pytest.raises(ValueError):
        await svc.backfill_order_items(limit=101)


@pytest.mark.asyncio
async def test_backfill_server_checkpoint_ignores_stale_browser_cursor():
    svc, repo = make_service()
    cp_repo = checkpoint_repo()
    orders = [SimpleNamespace(id=uuid4(), external_id=str(i), items=[]) for i in range(101)]
    repo.find_orders_without_items.return_value = orders
    repo.count_orders_without_items.return_value = 101
    svc._client.fetch_order.return_value = {"itens": []}
    first = await svc.backfill_order_item_request(cp_repo, "owner")
    repo.find_orders_without_items.return_value = orders[100:]
    last = await svc.backfill_order_item_request(cp_repo, "owner", cursor="stale")
    repo.find_orders_without_items.assert_awaited_with(
        limit=101, after_external_id=first.next_cursor
    )
    assert not last.has_more
    cp = await cp_repo.get("order_items")
    assert cp.totals["detail_without_items"] == 101
    assert cp.totals["remaining_without_items"] == 101
    assert cp.status == "completed"
    before = svc._client.fetch_order.await_count
    await svc.backfill_order_item_request(cp_repo, "owner")
    assert svc._client.fetch_order.await_count == before
