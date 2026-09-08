from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI, HTTPException
from httpx import ASGITransport, AsyncClient

from backend.core.security.deps import require_admin_auth
from backend.modules.integration.checkpoint import CheckpointRepository
from backend.modules.integration.di import get_bling_sync_service, get_checkpoint_repository
from backend.modules.integration.router import router
from backend.tests.unit.modules.integration.test_product_request_bounds import service


def checkpoint_repo(cp=None):
    db = AsyncMock()
    db.execute.return_value = MagicMock()
    db.execute.return_value.scalar.return_value = True
    repo = CheckpointRepository(db)
    repo.get = AsyncMock(side_effect=lambda entity: cp)

    async def upsert(entity, **values):
        nonlocal cp
        if cp is None:
            cp = SimpleNamespace(totals={}, current_page=1, last_completed_page=0, status="idle")
        for key, value in values.items():
            setattr(cp, key, value)
        return cp

    repo.upsert = AsyncMock(side_effect=upsert)
    return repo


@pytest.mark.asyncio
async def test_persisted_ownership_fences_other_browser_and_audits_expiry():
    repo = checkpoint_repo()
    cp = await repo.claim_products("owner1")
    cp.current_page = 11
    with pytest.raises(HTTPException) as error:
        await repo.claim_products("owner2")
    assert error.value.status_code == 409
    cp.totals["expires_at"] = (datetime.now(UTC) - timedelta(seconds=1)).isoformat()
    claimed = await repo.claim_products("owner2")
    assert claimed.current_page == 11
    assert claimed.totals["operation_id"] == "owner2"
    assert claimed.totals["ttl_takeovers"] == 1
    assert "last_expired_at" in claimed.totals


@pytest.mark.asyncio
async def test_advisory_guard_fences_concurrent_requests_even_same_owner():
    repo = checkpoint_repo()
    repo.db.execute.return_value.scalar.return_value = False
    with pytest.raises(HTTPException) as error:
        await repo.claim_products("same-owner")
    assert error.value.status_code == 409
    repo.get.assert_not_called()


@pytest.mark.asyncio
async def test_server_checkpoint_23_pages_failure_after_10_and_response_retry():
    repo = checkpoint_repo()
    ranges = []
    for i in range(6):
        svc = service()
        svc._client.fetch_products_page.side_effect = (
            RuntimeError("upstream unavailable")
            if i == 2
            else lambda *a, page, **kw: [{}] * (23 if page == 23 else 100)
        )
        batch = await svc.sync_product_request(repo, "owner")
        ranges.append((batch.start_page, batch.end_page))
    assert ranges == [(1, 5), (6, 10), (11, 10), (11, 15), (16, 20), (21, 23)]
    cp = await repo.get("products")
    assert cp.status == "completed"
    assert cp.totals["processed"] == 2223
    svc = service()
    retry = await svc.sync_product_request(repo, "owner")
    assert retry.natural_end and retry.pages_processed == 0
    svc._client.fetch_products_page.assert_not_called()


@pytest.mark.asyncio
@pytest.mark.parametrize("path", ["sync/products", "sync-products-batch", "sync-all"])
async def test_all_http_product_paths_are_bounded_and_checkpointed(path):
    app = FastAPI()
    app.include_router(router)
    svc = service()
    svc._client.fetch_products_page.return_value = [{}] * 100
    svc._data_repo.session.execute = AsyncMock(return_value=MagicMock())
    svc._data_repo.session.execute.return_value.scalar.return_value = 0
    svc._data_repo.count_orders_without_items = AsyncMock(return_value=0)
    repo = checkpoint_repo()
    app.dependency_overrides[require_admin_auth] = lambda: None
    app.dependency_overrides[get_bling_sync_service] = lambda: svc
    app.dependency_overrides[get_checkpoint_repository] = lambda: repo
    with patch("backend.modules.integration.router.SyncLock") as lock:
        lock.return_value.acquire = AsyncMock(return_value=True)
        lock.return_value.release = AsyncMock(return_value=True)
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                f"/integrations/bling/{path}?operation_id=owner", json={"operation_id": "owner"}
            )
    assert response.status_code == 200, response.text
    assert svc._client.fetch_products_page.await_count == 5
    assert (await repo.get("products")).current_page == 6
