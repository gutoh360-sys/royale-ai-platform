"""Docker-free tests for sync_products_batch.

These tests use mocks/fakes to validate behavior without PostgreSQL/Docker.
Tests that require Docker are in test_sync_products_batch.py (not executed locally).

Test coverage:
A. Full page → has_more true, processes all items
B. Incomplete page → natural_end true
C. Empty page → natural_end true
D. Pages 1-5 then 6-10 without repetition
E. Product already exists → update
F. Product new → create
G. Incomplete product → skipped with reason
H. Individual error → continues batch
I. next_page correct
J. skip_reasons aggregated
"""

from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest

from backend.core.config.base import Settings
from backend.modules.integration.sync_service import BlingSyncService


@pytest.fixture
def settings() -> Settings:
    return Settings(
        ENVIRONMENT="test",
        DEBUG=True,
        DATABASE_URL="sqlite+aiosqlite:///./test.db",
        REDIS_URL="redis://localhost:6379/0",
        ENCRYPTION_KEY="dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1jaGFycy0tLS0=",
        BLING_CLIENT_ID="test-client-id",
        BLING_CLIENT_SECRET="test-client-secret",
        BLING_REDIRECT_URI="http://test/bling/callback",
        BLING_ADMIN_USERNAME="royale-admin",
        BLING_ADMIN_PASSWORD="test-admin-password",
        BLING_API_BASE_URL="https://api.bling.com.br/Api/v3",
        BLING_AUTHORIZE_URL="https://bling.com.br/Api/v3/oauth/authorize",
        BLING_TOKEN_URL="https://api.bling.com.br/oauth/token",
        BLING_REVOKE_URL="https://api.bling.com.br/oauth/revoke",
        BLING_MAX_REQUESTS_PER_SECOND=1000.0,
        BLING_MAX_BACKOFF_SECONDS=1.0,
    )


async def _token_provider() -> str:
    return "token"


def _make_product(bling_id: str, codigo: str, nome: str = "Product") -> dict[str, Any]:
    return {"id": bling_id, "codigo": codigo, "nome": nome, "situacao": "A"}


def _make_incomplete_product(bling_id: str) -> dict[str, Any]:
    return {"id": bling_id, "codigo": "", "nome": ""}


class FakeBlingClient:
    """In-memory BlingApiClient for testing."""

    def __init__(self, pages: dict[int, list[dict[str, Any]]]):
        self._pages = pages
        self.calls: list[tuple[int, int]] = []

    async def fetch_products_page(
        self, token_provider, *, page: int, page_size: int = 100
    ) -> list[dict[str, Any]]:
        self.calls.append((page, page_size))
        return self._pages.get(page, [])


class FakeSession:
    """In-memory async session with begin_nested support."""

    def __init__(self):
        self._savepoint = MagicMock()
        self._savepoint.__aenter__ = AsyncMock(return_value=self._savepoint)
        self._savepoint.__aexit__ = AsyncMock(return_value=False)

    def begin_nested(self):
        return self._savepoint


class FakeProduct:
    """Minimal Product-like object for testing."""

    def __init__(self, bling_id: str, sku: str, name: str):
        self.bling_id = bling_id
        self.sku = sku
        self.name = name
        self.description = None
        self.ean = None
        self.category_id = None
        self.price = 0.0
        self.cost = 0.0
        self.stock_quantity = 0
        self.active = True
        self.attributes = {}
        self.last_synced_at = None


class FakeSyncDataRepository:
    """In-memory SyncDataRepository for testing."""

    def __init__(self):
        self.products: dict[str, FakeProduct] = {}
        self.session = FakeSession()

    async def find_product_by_bling_id(self, bling_id: str):
        return self.products.get(bling_id)

    async def find_product_by_sku(self, sku: str):
        for p in self.products.values():
            if p.sku == sku:
                return p
        return None

    async def upsert_category(self, bling_id: str, name: str):
        return MagicMock(id="cat-1", bling_id=bling_id, name=name)

    async def upsert_product(self, product):
        self.products[product.bling_id] = product
        return product


class FakeSyncLogRepository:
    """In-memory ISyncLogRepository for testing."""

    def __init__(self):
        self.logs: list = []

    async def create(self, log):
        self.logs.append(log)
        return log

    async def finalize(self, log_id, **kwargs):
        pass

    async def record_error(self, *args, **kwargs):
        pass

    async def record_skip(self, *args, **kwargs):
        pass


def _build_service(client, data_repo=None, log_repo=None):
    if data_repo is None:
        data_repo = FakeSyncDataRepository()
    if log_repo is None:
        log_repo = FakeSyncLogRepository()

    service = BlingSyncService(
        client=client,
        token_provider=_token_provider,
        sync_log_repo=log_repo,
        data_repo=data_repo,
        settings=Settings(
            ENVIRONMENT="test",
            DEBUG=True,
            DATABASE_URL="sqlite+aiosqlite:///./test.db",
            REDIS_URL="redis://localhost:6379/0",
            ENCRYPTION_KEY="dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1jaGFycy0tLS0=",
            BLING_CLIENT_ID="test-client-id",
            BLING_CLIENT_SECRET="test-client-secret",
            BLING_REDIRECT_URI="http://test/bling/callback",
            BLING_ADMIN_USERNAME="royale-admin",
            BLING_ADMIN_PASSWORD="test-admin-password",
            BLING_API_BASE_URL="https://api.bling.com.br/Api/v3",
            BLING_AUTHORIZE_URL="https://bling.com.br/Api/v3/oauth/authorize",
            BLING_TOKEN_URL="https://api.bling.com.br/oauth/token",
            BLING_REVOKE_URL="https://api.bling.com.br/oauth/revoke",
            BLING_MAX_REQUESTS_PER_SECOND=1000.0,
            BLING_MAX_BACKOFF_SECONDS=1.0,
        ),
    )
    return service, data_repo


# --- Tests ---


class TestSyncProductsBatchPagination:
    """Tests for pagination and natural end detection."""

    async def test_full_page_has_more(self):
        """A: Page returns 100 items → has_more=True, processes all."""
        page1 = [_make_product(f"p{i}", f"SKU{i}") for i in range(100)]
        page2 = [_make_product(f"p{i}", f"SKU{i}") for i in range(100, 200)]
        page3 = [_make_product(f"p{i}", f"SKU{i}") for i in range(200, 210)]

        client = FakeBlingClient({1: page1, 2: page2, 3: page3})
        service, _ = _build_service(client)

        result = await service.sync_products_batch(start_page=1, pages=2, page_size=100)

        assert result.fetched == 200
        assert result.processed == 200
        assert result.has_more is True
        assert result.natural_end is False
        assert result.next_page == 3
        assert len(client.calls) == 2

    async def test_incomplete_page_natural_end(self):
        """B: Page returns 50 items (< 100) → natural_end=True."""
        page1 = [_make_product(f"p{i}", f"SKU{i}") for i in range(50)]

        client = FakeBlingClient({1: page1})
        service, _ = _build_service(client)

        result = await service.sync_products_batch(start_page=1, pages=5, page_size=100)

        assert result.fetched == 50
        assert result.processed == 50
        assert result.natural_end is True
        assert result.has_more is False
        assert result.next_page is None

    async def test_empty_page_natural_end(self):
        """C: Page returns empty → natural_end=True."""
        client = FakeBlingClient({1: []})
        service, _ = _build_service(client)

        result = await service.sync_products_batch(start_page=1, pages=5, page_size=100)

        assert result.fetched == 0
        assert result.processed == 0
        assert result.natural_end is True
        assert result.has_more is False

    async def test_pages_dont_repeat(self):
        """D: Pages 1-5 then 6-10 don't process same products."""
        pages_1_5 = {i: [_make_product(f"p{i}", f"SKU{i}")] for i in range(1, 6)}
        pages_6_10 = {i: [_make_product(f"p{i}", f"SKU{i}")] for i in range(6, 11)}

        client1 = FakeBlingClient(pages_1_5)
        service1, repo1 = _build_service(client1)

        result1 = await service1.sync_products_batch(start_page=1, pages=5, page_size=1)
        assert result1.processed == 5

        client2 = FakeBlingClient(pages_6_10)
        service2, repo2 = _build_service(client2)

        result2 = await service2.sync_products_batch(start_page=6, pages=5, page_size=1)
        assert result2.processed == 5

        assert len(client1.calls) == 5
        assert len(client2.calls) == 5
        assert client1.calls[0][0] == 1
        assert client2.calls[0][0] == 6


class TestSyncProductsBatchUpsert:
    """Tests for product creation and update logic."""

    async def test_existing_product_updates(self):
        """E: Product with same bling_id → updated."""
        page1 = [_make_product("p1", "SKU1", "Updated Name")]

        client = FakeBlingClient({1: page1})
        service, repo = _build_service(client)
        repo.products["p1"] = FakeProduct("p1", "SKU1", "Old Name")

        result = await service.sync_products_batch(start_page=1, pages=1, page_size=100)

        assert result.updated == 1
        assert result.created == 0
        assert repo.products["p1"].name == "Updated Name"

    async def test_new_product_creates(self):
        """F: New product → created."""
        page1 = [_make_product("p-new", "SKU-NEW", "New Product")]

        client = FakeBlingClient({1: page1})
        service, repo = _build_service(client)

        result = await service.sync_products_batch(start_page=1, pages=1, page_size=100)

        assert result.created == 1
        assert result.updated == 0
        assert "p-new" in repo.products

    async def test_incomplete_product_skipped(self):
        """G: Product missing codigo/nome → skipped with reason."""
        page1 = [_make_incomplete_product("p-bad")]

        client = FakeBlingClient({1: page1})
        service, _ = _build_service(client)

        result = await service.sync_products_batch(start_page=1, pages=1, page_size=100)

        assert result.skipped == 1
        assert result.processed == 0
        assert sum(result.skip_reasons.values()) >= 1

    async def test_individual_error_continues(self):
        """H: One product incomplete → batch continues → others processed."""
        good = _make_product("p-good", "SKU-GOOD")
        bad_product = {"id": "p-bad", "codigo": None, "nome": None}
        page1 = [good, bad_product, _make_product("p-after", "SKU-AFTER")]

        client = FakeBlingClient({1: page1})
        service, _ = _build_service(client)

        result = await service.sync_products_batch(start_page=1, pages=1, page_size=100)

        assert result.processed == 2
        assert result.skipped == 1
        assert result.failed == 0

    async def test_next_page_correct(self):
        """I: next_page = start_page + pages when not natural_end."""
        page3 = [_make_product(f"p3-{i}", f"SKU3-{i}") for i in range(100)]

        client = FakeBlingClient({3: page3})
        service, _ = _build_service(client)

        result = await service.sync_products_batch(start_page=3, pages=1, page_size=100)

        assert result.start_page == 3
        assert result.end_page == 3
        assert result.pages_processed == 1
        assert result.next_page == 4
        assert result.has_more is True

    async def test_skip_reasons_aggregated(self):
        """J: Multiple incomplete products → skip_reasons counted."""
        page1 = [
            _make_incomplete_product("p1"),
            _make_incomplete_product("p2"),
            _make_product("p3", "SKU3"),
        ]

        client = FakeBlingClient({1: page1})
        service, _ = _build_service(client)

        result = await service.sync_products_batch(start_page=1, pages=1, page_size=100)

        assert result.processed == 1
        assert result.skipped == 2
        assert sum(result.skip_reasons.values()) == 2


class TestStockQuantityNormalization:
    """Tests for _stock_quantity clamping negative values to 0."""

    def test_positive_stock(self):
        """A: saldo 10 → stock_quantity 10."""
        from backend.modules.integration.sync_service import BlingSyncService

        raw = {"estoque": {"saldoVirtualTotal": 10}}
        assert BlingSyncService._stock_quantity(raw) == 10

    def test_zero_stock(self):
        """B: saldo 0 → stock_quantity 0."""
        from backend.modules.integration.sync_service import BlingSyncService

        raw = {"estoque": {"saldoVirtualTotal": 0}}
        assert BlingSyncService._stock_quantity(raw) == 0

    def test_negative_one_stock(self):
        """C: saldo -1 → stock_quantity 0."""
        from backend.modules.integration.sync_service import BlingSyncService

        raw = {"estoque": {"saldoVirtualTotal": -1}}
        assert BlingSyncService._stock_quantity(raw) == 0

    def test_negative_ten_stock(self):
        """D: saldo -10 → stock_quantity 0."""
        from backend.modules.integration.sync_service import BlingSyncService

        raw = {"estoque": {"saldoVirtualTotal": -10}}
        assert BlingSyncService._stock_quantity(raw) == 0

    def test_negative_string_stock(self):
        """E: saldo string "-1" → 0."""
        from backend.modules.integration.sync_service import BlingSyncService

        raw = {"estoque": {"saldoVirtualTotal": "-1"}}
        assert BlingSyncService._stock_quantity(raw) == 0

    def test_negative_decimal_stock(self):
        """F: saldo decimal "-1.5" → int(float(-1.5)) = -1 → clamp to 0."""
        from backend.modules.integration.sync_service import BlingSyncService

        raw = {"estoque": {"saldoVirtualTotal": "-1.5"}}
        assert BlingSyncService._stock_quantity(raw) == 0

    def test_missing_estoque(self):
        """Sem estoque → 0."""
        from backend.modules.integration.sync_service import BlingSyncService

        assert BlingSyncService._stock_quantity({}) == 0

    def test_stock_list_format(self):
        """Estoque em formato lista."""
        from backend.modules.integration.sync_service import BlingSyncService

        raw = {"estoque": [{"saldoVirtualTotal": -3}]}
        assert BlingSyncService._stock_quantity(raw) == 0
