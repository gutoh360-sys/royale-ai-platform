from contextlib import asynccontextmanager
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from backend.modules.integration.sync_service import BlingSyncService


@asynccontextmanager
async def nested():
    yield


def service():
    repo = SimpleNamespace(session=SimpleNamespace(begin_nested=nested))
    svc = BlingSyncService(
        AsyncMock(),
        AsyncMock(),
        AsyncMock(),
        repo,
        SimpleNamespace(
            BLING_PRODUCT_SYNC_BATCH_PAGES=5,
            BLING_PRODUCT_SYNC_MAX_PAGES=10000,
            BLING_SYNC_PAGE_SIZE=2,
        ),
    )
    svc._upsert_product = AsyncMock(return_value="created")
    return svc


@pytest.mark.asyncio
async def test_one_request_is_bounded():
    svc = service()
    svc._client.fetch_products_page.return_value = [{}, {}]
    await svc.sync_products()
    assert svc._client.fetch_products_page.await_count == 5


@pytest.mark.asyncio
async def test_23_pages_partial_end():
    svc = service()
    svc._client.fetch_products_page.side_effect = lambda *a, page, **kw: (
        [{}] * (1 if page == 23 else 2)
    )
    cursor = 1
    ranges = []
    while cursor:
        result = await svc.sync_products_batch(start_page=cursor, page_size=2)
        ranges.append((result.start_page, result.end_page, result.pages_processed))
        cursor = result.next_page
    assert ranges == [(1, 5, 5), (6, 10, 5), (11, 15, 5), (16, 20, 5), (21, 23, 3)]


@pytest.mark.asyncio
async def test_failure_after_10_resumes_11():
    svc = service()
    svc._client.fetch_products_page.side_effect = RuntimeError("unavailable")
    result = await svc.sync_products_batch(start_page=11)
    assert (result.end_page, result.pages_processed, result.next_page) == (10, 0, 11)


@pytest.mark.asyncio
async def test_cannot_request_more_than_five_pages():
    svc = service()
    with pytest.raises(ValueError):
        await svc.sync_products_batch(pages=6)
