# Bling Data Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the real Bling v3 data layer for Royale — pull products, categories and sales orders from the Bling API (OAuth already implemented in PRs #009/#010) and persist them into the OLTP schemas (`operational.products`, `operational.categories`, `operational.orders`, `operational.sync_logs`), exposed via new admin-only sync endpoints.

**Architecture:** Pure addition to `backend.modules.integration` (hexagonal, no cross-module imports). `BlingApiClient` gains `list_resource` + `fetch_products`/`fetch_categories`/`fetch_orders`. New `dto.py` + `mapper.py` normalize Bling payloads. New `sync.py` service orchestrates fetch → upsert with per-item dedup and `SyncLog`/`SyncError` persistence. New repository implements ports from `ports.py`. Two admin-protected router endpoints trigger it. New settings in `Settings`.

**Tech Stack:** FastAPI, SQLAlchemy 2 async, Pydantic v2, httpx, pytest (testcontainers); requires-python ≥ 3.12; Ruff, mypy strict, import-linter enforced.

## Global Constraints

- Module boundary: `backend.modules.integration` may import `backend.database.*`, `backend.core.*`, and same-module files. It must NOT import any other `backend.modules.*` package (import-linter `forbidden_imports`). Reuse existing models — do not create models or migrations.
- Persist via existing models: `Product` (`sku`/`bling_id` unique non-null `String(50)`), `Category` (`bling_id` unique non-null), `Order` (`external_id`), `OrderItem`, `SyncLog` (type `'full'`, entity `'products'|'orders'`, status `'running'|'completed'|'failed'`), `SyncError`.
- Skip-and-log (never crash the run) items whose required external key is missing (`id`/`codigo` for products, `id` for orders).
- Bling v3 list envelope: `{"data": [...], "response": {"paginacao": {"totalPaginas": N}}}`. `data` may also be a single dict for detail endpoints.
- TDD mandatory throughout; verify RED then GREEN for every task.
- All commands run from repo root `C:\Users\gutod\Documents\royale-platform`.
- Testcontainers need Docker; when Docker is down the existing container-backed tests error. Client/service/router tests here use mock transport/fakes; only repository tests use `pg_engine`.
- No secrets committed. Conventional Commits.

---

### Task 1: BlingApiClient paginated fetches

**Files:**
- Modify: `backend/modules/integration/client.py`
- Test: `backend/tests/unit/modules/integration/test_client_pages.py`

**Interfaces:**
- Consumes: `BlingApiClient` (settings, `_throttle`, `_sanitize_request_error`, `ApiError` from `backend/modules/integration/errors.py`).
- Produces:
  - `async def list_resource(self, path: str, token_provider: Callable[[], Awaitable[str]], params: dict[str, str | int]) -> list[dict[str, Any]]`
  - `async def fetch_products(self, token_provider, *, page_size: int = 100) -> list[dict[str, Any]]`
  - `async def fetch_categories(self, token_provider) -> list[dict[str, Any]]`
  - `async def fetch_orders(self, token_provider, *, page_size: int = 100, data_inicial: str | None = None, data_final: str | None = None) -> list[dict[str, Any]]`
- `get_authenticated` signature becomes `get_authenticated(self, path: str, token_provider, params: dict[str, str | int] | None = None)` — existing positional callers unchanged.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/unit/modules/integration/test_client_pages.py`:

```python
from collections.abc import Callable
from typing import Any

import httpx
import pytest

from backend.core.config.base import Settings
from backend.modules.integration.client import BlingApiClient
from backend.modules.integration.errors import ApiError


def _make_client(
    settings: Settings,
    handler: Callable[[httpx.Request], httpx.Response],
) -> BlingApiClient:
    transport = httpx.MockTransport(handler)
    http = httpx.AsyncClient(transport=transport, timeout=httpx.Timeout(1.0))
    return BlingApiClient(settings, client=http)


async def _provider() -> str:
    return "jwt-access"


def _page(items: list[dict[str, Any]], page: int, total_pages: int) -> dict[str, Any]:
    return {
        "data": items,
        "response": {
            "paginacao": {
                "pagina": page,
                "limite": 100,
                "totalPaginas": total_pages,
                "totalRegistros": 50,
            }
        },
    }


async def test_list_resource_accumulates_pages(settings: Settings) -> None:
    pages: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        page = request.url.params["pagina"]
        pages.append(page)
        if page == "1":
            return httpx.Response(200, json=_page([{"id": 1}, {"id": 2}], 1, 2))
        return httpx.Response(200, json=_page([{"id": 3}], 2, 2))

    client = _make_client(settings, handler)
    items = await client.list_resource("/categorias/produtos", _provider, {"limite": 100})

    assert items == [{"id": 1}, {"id": 2}, {"id": 3}]
    assert pages == ["1", "2"]


async def test_list_resource_handles_non_200_with_error(settings: Settings) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(422, json={"error": {"description": "bad"}})

    client = _make_client(settings, handler)
    with pytest.raises(ApiError) as exc_info:
        await client.list_resource("/items", _provider, {"limite": 100})
    assert "422" in str(exc_info.value)


async def test_fetch_products_sends_query_params(settings: Settings) -> None:
    captured: dict[str, Any] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["auth"] = request.headers.get("Authorization")
        return httpx.Response(200, json=_page([{"id": 1}], 1, 1))

    client = _make_client(settings, handler)
    items = await client.fetch_products(_provider, page_size=50)

    assert items == [{"id": 1}]
    assert "pagina=1" in captured["url"]
    assert "limite=50" in captured["url"]
    assert "criterio=2" in captured["url"]
    assert "tipo=T" in captured["url"]
    assert captured["auth"] == "Bearer jwt-access"


async def test_fetch_orders_passes_date_filters(settings: Settings) -> None:
    captured: dict[str, Any] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        return httpx.Response(200, json=_page([], 1, 1))

    client = _make_client(settings, handler)
    await client.fetch_orders(_provider, data_inicial="2026-01-01", data_final="2026-01-31")

    assert "dataInicial=2026-01-01" in captured["url"]
    assert "dataFinal=2026-01-31" in captured["url"]
```

- [ ] **Step 2: Run, verify it fails**

Run: `python -m pytest backend/tests/unit/modules/integration/test_client_pages.py -q`
Expected: AttributeError — `BlingApiClient` has no `list_resource`.

- [ ] **Step 3: Implement minimal**

In `backend/modules/integration/client.py`, update `get_authenticated` to accept optional params and build the URL:

```python
from urllib.parse import urlencode, urlsplit, urlunsplit

def _with_query(url: str, params: dict[str, str | int]) -> str:
    parts = urlsplit(url)
    query = urlencode(params)
    if parts.query:
        query = parts.query + "&" + query
    return urlunsplit((parts.scheme, parts.netloc, parts.path, query, parts.fragment))

# inside get_authenticated:
url = self._settings.BLING_API_BASE_URL + path
if params:
    url = _with_query(url, params)
```

Change the signature to: `async def get_authenticated(self, path: str, token_provider, params: dict[str, str | int] | None = None) -> httpx.Response:` (existing tests pass only `path` + provider, so no breakage).

Add inside the class:

```python
async def list_resource(
    self,
    path: str,
    token_provider: Callable[[], Awaitable[str]],
    params: dict[str, str | int],
) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    page = 1
    while True:
        query = dict(params)
        query["pagina"] = page
        response = await self.get_authenticated(path, token_provider, query)
        if response.status_code != 200:
            raise ApiError(f"list resource failed with status {response.status_code}")
        body = response.json()
        payload = body.get("data")
        if isinstance(payload, list):
            items.extend(payload)
        elif isinstance(payload, dict):
            items.append(payload)
        pagination = (body.get("response") or {}).get("paginacao") or {}
        total_pages = pagination.get("totalPaginas")
        if total_pages is None or page >= int(total_pages):
            break
        page += 1
    return items


async def fetch_products(
    self,
    token_provider: Callable[[], Awaitable[str]],
    *,
    page_size: int = 100,
) -> list[dict[str, Any]]:
    return await self.list_resource(
        "/produtos",
        token_provider,
        {"limite": page_size, "criterio": 2, "tipo": "T"},
    )


async def fetch_categories(
    self,
    token_provider: Callable[[], Awaitable[str]],
) -> list[dict[str, Any]]:
    return await self.list_resource("/categorias/produtos", token_provider, {"limite": 100})


async def fetch_orders(
    self,
    token_provider: Callable[[], Awaitable[str]],
    *,
    page_size: int = 100,
    data_inicial: str | None = None,
    data_final: str | None = None,
) -> list[dict[str, Any]]:
    params: dict[str, str | int] = {"limite": page_size}
    if data_inicial:
        params["dataInicial"] = data_inicial
    if data_final:
        params["dataFinal"] = data_final
    return await self.list_resource("/pedidos/vendas", token_provider, params)
```

- [ ] **Step 4: Run, verify it passes**

Run: `python -m pytest backend/tests/unit/modules/integration/test_client_pages.py backend/tests/unit/modules/integration/test_client.py -q`
Expected: 4 new tests pass; existing `test_client.py` (incl. `test_get_authenticated_uses_bearer_and_enable_jwt`) still passes.

- [ ] **Step 5: Lint + commit**

Run: `ruff check backend/modules/integration/client.py backend/tests/unit/modules/integration/test_client_pages.py`
Then: `git add -A && git commit -m "feat(integration): add paginated Bling list fetches"`

---

### Task 2: Sync DTOs

**Files:**
- Create: `backend/modules/integration/dto.py`
- Test: `backend/tests/unit/modules/integration/test_dto.py`

**Interfaces:**
- Consumed by: Task 3 mapper, Task 5 sync service, Task 6 repository.
- Produces Pydantic models: `CategoryDto`, `ProductDto`, `OrderItemDto`, `OrderDto`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/unit/modules/integration/test_dto.py`:

```python
from datetime import UTC, datetime
from decimal import Decimal

from backend.modules.integration.dto import (
    CategoryDto,
    OrderDto,
    OrderItemDto,
    ProductDto,
)


def test_product_dto_roundtrip() -> None:
    product = ProductDto(
        id="123",
        sku="SKU-1",
        gtin="7891234567890",
        name="Produto Teste",
        description="Descricao",
        brand="Marca",
        price=Decimal("10.50"),
        cost=Decimal("4.20"),
        stock=3,
        category_id="99",
        category_name="Roupas",
        active=True,
    )
    assert product.sku == "SKU-1"
    assert product.price == Decimal("10.50")
    assert product.category_id == "99"


def test_order_dto_roundtrip_with_items() -> None:
    order = OrderDto(
        id="321",
        number="500",
        external_id="321",
        ordered_at=datetime(2026, 1, 2, tzinfo=UTC),
        status="aberto",
        customer_name="Cliente",
        customer_document="123456789",
        customer_email="c@example.com",
        customer_phone="11999999999",
        total=Decimal("20.00"),
        shipping=Decimal("2.00"),
        discount=Decimal("0.00"),
        payment_method="pix",
        notes=None,
        items=[
            OrderItemDto(
                quantity=2,
                unit_price=Decimal("10.00"),
            )
        ],
    )
    assert order.items[0].quantity == 2
    assert order.total == Decimal("20.00")


def test_category_dto_roundtrip() -> None:
    category = CategoryDto(id="7", name="Camisetas", parent_id=None)
    assert category.parent_id is None
```

- [ ] **Step 2: Run, verify it fails**

Run: `python -m pytest backend/tests/unit/modules/integration/test_dto.py -q`
Expected: ModuleNotFoundError — no `backend.modules.integration.dto`.

- [ ] **Step 3: Implement**

Create `backend/modules/integration/dto.py`:

```python
from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class CategoryDto(BaseModel):
    id: str
    name: str
    parent_id: str | None = None


class ProductDto(BaseModel):
    id: str
    sku: str
    gtin: str | None = None
    name: str
    description: str | None = None
    brand: str | None = None
    price: Decimal
    cost: Decimal | None = None
    stock: int = 0
    category_id: str | None = None
    category_name: str | None = None
    active: bool = True


class OrderItemDto(BaseModel):
    sku: str | None = None
    bling_id: str | None = None
    product_name: str | None = None
    quantity: int = 0
    unit_price: Decimal = Decimal("0")
    discount: Decimal = Decimal("0")


class OrderDto(BaseModel):
    id: str
    number: str
    external_id: str
    ordered_at: datetime
    status: str = "aberto"
    customer_name: str
    customer_document: str | None = None
    customer_email: str | None = None
    customer_phone: str | None = None
    total: Decimal = Decimal("0")
    shipping: Decimal = Decimal("0")
    discount: Decimal = Decimal("0")
    payment_method: str | None = None
    notes: str | None = None
    items: list[OrderItemDto] = []
```

- [ ] **Step 4: Run, verify it passes**

Run: `python -m pytest backend/tests/unit/modules/integration/test_dto.py -q`
Expected: PASS.

- [ ] **Step 5: Commit**

Run: `ruff check backend/modules/integration/dto.py`
Then: `git add -A && git commit -m "feat(integration): add Bling sync DTOs"`

---

### Task 3: Bling payload mapper

**Files:**
- Create: `backend/modules/integration/mapper.py`
- Test: `backend/tests/unit/modules/integration/test_mapper.py`

**Interfaces:**
- Consumes: Task 2 DTOs.
- Produces: `parse_product(item: dict[str, Any]) -> ProductDto`, `parse_category(item: dict[str, Any]) -> CategoryDto`, `parse_order(item: dict[str, Any]) -> OrderDto`.

Bling v3 fields used (verified against list responses):
- product: `id`, `codigo`, `nome`, `gtin`, `descricao`, `preco`, `precoCusto`, `marca` (string or `{"descricao": ...}`), `estoque` (list of `{"saldo": N}` or dict), `categoria` (`{"id", "descricao"}`), `situacao` (`"A"` active).
- category: `id`, `descricao` (name), optional `categoriaPai` (`{"id"}`).
- order: `id`, `numero`, `data` (ISO-8601), `situacao` (`{"valor": ...}`), `contato` (`{"nome","numeroDocumento","email","celular"}`), `total` (`{"valor","desconto","frete"}`), `pagamento` (`{"condicaoPagamento"}`), `itens` (list of `{"quantidade","valor","desconto"}`).

Parsing is tolerant: missing nested dicts / wrong types default to `"0"`/`0`/`None`; never raises on a malformed payload.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/unit/modules/integration/test_mapper.py`:

```python
from decimal import Decimal

from backend.modules.integration.mapper import parse_category, parse_order, parse_product


def test_parse_product_maps_fields() -> None:
    product = parse_product(
        {
            "id": 123,
            "codigo": "SKU-1",
            "nome": "Produto Teste",
            "gtin": "7891234567890",
            "descricao": "Descricao",
            "preco": 10.50,
            "precoCusto": 4.20,
            "marca": "Minha Marca",
            "estoque": [{"saldo": 3}],
            "categoria": {"id": 99, "descricao": "Roupas"},
            "situacao": "A",
        }
    )
    assert product.id == "123"
    assert product.sku == "SKU-1"
    assert product.gtin == "7891234567890"
    assert product.name == "Produto Teste"
    assert product.brand == "Minha Marca"
    assert product.price == Decimal("10.50")
    assert product.cost == Decimal("4.20")
    assert product.stock == 3
    assert product.category_id == "99"
    assert product.category_name == "Roupas"
    assert product.active is True


def test_parse_product_missing_optional_fields_defaults() -> None:
    product = parse_product({"id": 1, "codigo": "X", "nome": "X"})
    assert product.gtin is None
    assert product.brand is None
    assert product.price == Decimal("0")
    assert product.stock == 0
    assert product.category_id is None
    assert product.active is True


def test_parse_category_maps_name_and_parent() -> None:
    category = parse_category(
        {"id": 5, "descricao": "Camisetas", "categoriaPai": {"id": 1}}
    )
    assert category.id == "5"
    assert category.name == "Camisetas"
    assert category.parent_id == "1"


def test_parse_order_maps_flat_and_nested() -> None:
    order = parse_order(
        {
            "id": 321,
            "numero": "500",
            "data": "2026-01-02T10:00:00-03:00",
            "situacao": {"id": 2, "valor": "aberto"},
            "contato": {
                "id": 7,
                "nome": "Cliente",
                "numeroDocumento": "123456789",
                "email": "c@example.com",
                "celular": "11999999999",
            },
            "total": {"valor": 20.0, "desconto": 1.0, "frete": 2.0},
            "pagamento": {"condicaoPagamento": "pix"},
            "itens": [
                {"quantidade": 2, "valor": 10.0, "desconto": 0.5}
            ],
        }
    )
    assert order.id == "321"
    assert order.number == "500"
    assert order.external_id == "321"
    assert order.customer_name == "Cliente"
    assert order.customer_document == "123456789"
    assert order.customer_email == "c@example.com"
    assert order.total == Decimal("20.00")
    assert order.shipping == Decimal("2.00")
    assert order.items[0].quantity == 2
    assert order.items[0].unit_price == Decimal("10.00")
    assert order.payment_method == "pix"
```

- [ ] **Step 2: Run, verify it fails**

Run: `python -m pytest backend/tests/unit/modules/integration/test_mapper.py -q`
Expected: ImportError — no `backend.modules.integration.mapper`.

- [ ] **Step 3: Implement**

Create `backend/modules/integration/mapper.py`:

```python
from __future__ import annotations

from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Any

from backend.modules.integration.dto import CategoryDto, OrderDto, OrderItemDto, ProductDto


def _decimal(value: Any) -> Decimal:
    if value is None:
        return Decimal("0")
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        return Decimal("0")


def _int(value: Any) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def _stock(items: Any) -> int:
    if isinstance(items, list) and items:
        value = items[0].get("saldo") if isinstance(items[0], dict) else None
        return _int(value)
    if isinstance(items, dict):
        return _int(items.get("saldo"))
    return 0


def parse_product(item: dict[str, Any]) -> ProductDto:
    category = item.get("categoria") or {}
    product_id = str(item.get("id", ""))
    if not product_id:
        raise ValueError("product is missing id")
    brand = item.get("marca")
    if isinstance(brand, dict):
        brand = brand.get("descricao")
    return ProductDto(
        id=product_id,
        sku=str(item.get("codigo", "")),
        gtin=str(item["gtin"]) if item.get("gtin") else None,
        name=str(item.get("nome", "")),
        description=item.get("descricao") or None,
        brand=str(brand) if brand else None,
        price=_decimal(item.get("preco")),
        cost=_decimal(item.get("precoCusto")),
        stock=_stock(item.get("estoque")),
        category_id=str(category.get("id")) if category.get("id") is not None else None,
        category_name=category.get("descricao") or None,
        active=str(item.get("situacao", "A")) in ("A", "S"),
    )


def parse_category(item: dict[str, Any]) -> CategoryDto:
    parent = item.get("categoriaPai") or {}
    return CategoryDto(
        id=str(item.get("id", "")),
        name=str(item.get("descricao") or item.get("nome", "")),
        parent_id=str(parent.get("id")) if parent.get("id") is not None else None,
    )


def parse_order(item: dict[str, Any]) -> OrderDto:
    contact = item.get("contato") or {}
    total = item.get("total") or {}
    payment = item.get("pagamento") or {}
    situation = item.get("situacao") or {}
    order_id = str(item.get("id", ""))
    if not order_id:
        raise ValueError("order is missing id")
    raw_date = item.get("data")
    try:
        parsed_at = datetime.fromisoformat(str(raw_date).replace("Z", "+00:00"))
    except (ValueError, TypeError):
        parsed_at = datetime.now()
    return OrderDto(
        id=order_id,
        number=str(item.get("numero") or order_id),
        external_id=order_id,
        ordered_at=parsed_at,
        status=str(situation.get("valor", "aberto")),
        customer_name=str(contact.get("nome", "")),
        customer_document=str(contact["numeroDocumento"]) if contact.get("numeroDocumento") else None,
        customer_email=str(contact["email"]) if contact.get("email") else None,
        customer_phone=str(contact["celular"]) if contact.get("celular") else None,
        total=_decimal(total.get("valor")),
        shipping=_decimal(total.get("frete")),
        discount=_decimal(total.get("desconto")),
        payment_method=str(payment.get("condicaoPagamento")) or None,
        notes=item.get("observacoes") or None,
        items=[
            OrderItemDto(
                sku=str(raw.get("codigo")) if raw.get("codigo") is not None else None,
                bling_id=str(raw.get("produto", {}).get("id")) if isinstance(raw.get("produto"), dict) and raw.get("produto", {}).get("id") is not None else None,
                product_name=str(raw.get("descricao", "")),
                quantity=_int(raw.get("quantidade")),
                unit_price=_decimal(raw.get("valor")),
                discount=_decimal(raw.get("desconto")),
            )
            for raw in (item.get("itens") or [])
            if isinstance(raw, dict)
        ],
    )
```

- [ ] **Step 4: Run, verify it passes**

Run: `python -m pytest backend/tests/unit/modules/integration/test_mapper.py -q`
Expected: PASS.

- [ ] **Step 5: Commit**

Run: `ruff check backend/modules/integration/mapper.py`
Then: `git add -A && git commit -m "feat(integration): map Bling payloads to sync DTOs"`

---

### Task 4: Sync repo ports

**Files:**
- Modify: `backend/modules/integration/ports.py`
- Test: `backend/tests/unit/modules/integration/test_ports.py`

**Interfaces:**
- Produces (all in `backend.modules.integration.ports`):
  - `class IBlingSyncRepository(ABC)`: `get_product_by_bling_id(bling_id) -> Any | None`, `get_product_by_sku_or_bling(sku: str | None, bling_id: str | None) -> Any | None` (used to resolve `OrderItem.product_id`), `upsert_product(dto: ProductDto) -> Literal["created","updated"]`, `upsert_category(dto: CategoryDto) -> Literal["created","updated"]`, `find_order_by_external(external_id) -> Any | None`, `upsert_order(dto: OrderDto) -> Literal["created","updated"]`.
  - `class IBlingSyncLogRepository(ABC)`: `start(entity: str) -> SyncLog`, `add_error(log, external_id, message)`, `finish_ok(log, processed, created, updated, failed)`, `finish_failed(log, message)`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/unit/modules/integration/test_ports.py` (contract review — verifies the ports are importable and define the expected methods):

```python
from backend.modules.integration.ports import (
    IBlingSyncLogRepository,
    IBlingSyncRepository,
)


def test_sync_repo_port_methods_exist() -> None:
    methods = {
        "get_product_by_bling_id",
        "get_product_by_sku_or_bling",
        "upsert_product",
        "upsert_category",
        "find_order_by_external",
        "upsert_order",
    }
    assert methods <= set(dir(IBlingSyncRepository))


def test_sync_log_repo_port_methods_exist() -> None:
    methods = {"start", "add_error", "finish_ok", "finish_failed"}
    assert methods <= set(dir(IBlingSyncLogRepository))
```

- [ ] **Step 2: Run, verify it fails**

Run: `python -m pytest backend/tests/unit/modules/integration/test_ports.py -q`
Expected: ImportError — ports not yet defined.

- [ ] **Step 3: Implement**

Append to `backend/modules/integration/ports.py`:

```python
from typing import Any, Literal

from backend.database.models.sync import SyncLog
from backend.modules.integration.dto import CategoryDto, OrderDto, ProductDto


class IBlingSyncRepository(ABC):
    @abstractmethod
    async def get_product_by_bling_id(self, bling_id: str) -> Any | None: ...

    @abstractmethod
    async def get_product_by_sku_or_bling(
        self, sku: str | None, bling_id: str | None
    ) -> Any | None: ...

    @abstractmethod
    async def upsert_product(self, dto: ProductDto) -> Literal["created", "updated"]: ...

    @abstractmethod
    async def upsert_category(self, dto: CategoryDto) -> Literal["created", "updated"]: ...

    @abstractmethod
    async def find_order_by_external(self, external_id: str) -> Any | None: ...

    @abstractmethod
    async def upsert_order(self, dto: OrderDto) -> Literal["created", "updated"]: ...


class IBlingSyncLogRepository(ABC):
    @abstractmethod
    async def start(self, entity: str) -> SyncLog: ...

    @abstractmethod
    async def add_error(
        self, log: SyncLog, external_id: str, message: str
    ) -> None: ...

    @abstractmethod
    async def finish_ok(
        self,
        log: SyncLog,
        processed: int,
        created: int,
        updated: int,
        failed: int,
    ) -> None: ...

    @abstractmethod
    async def finish_failed(self, log: SyncLog, message: str) -> None: ...
```

- [ ] **Step 4: Run, verify it passes**

Run: `python -m pytest backend/tests/unit/modules/integration/test_ports.py -q`
Expected: PASS.

- [ ] **Step 5: Commit**

Run: `ruff check backend/modules/integration/ports.py`
Then: `git add -A && git commit -m "feat(integration): define Bling sync repository ports"`

---

### Task 5: Sync repository (Postgres)

**Files:**
- Create: `backend/modules/integration/sync_repository.py`
- Test: `backend/tests/unit/modules/integration/test_sync_repository.py`

**Interfaces:**
- Consumes: Task 2 DTOs, Task 4 ports, models `Product`/`Category`/`Order`/`OrderItem`/`SyncLog`/`SyncError`, `AsyncSession`.
- Produces: `class PostgresBlingSyncRepository(IBlingSyncRepository)` and `class PostgresBlingSyncLogRepository(IBlingSyncLogRepository)`, both taking `session: AsyncSession` in `__init__`.

Upsert semantics:
- `upsert_category`: find `Category` by `bling_id`; if missing create `Category(bling_id=dto.id, name=dto.name)`; else update `name`; return `"created"`/`"updated"`.
- `upsert_product`: find `Product` by `bling_id` (dto.id); if missing, ensure the product's category exists (upsert `Category(bling_id=dto.category_id or "0", name=dto.category_name or "Sem categoria")` first), then create `Product(sku=dto.sku or dto.id, bling_id=dto.id, name=dto.name, ...)`; else update mutable fields. Return the enum string.
- `find_order_by_external`: select `Order` by `external_id == dto.external_id` (marketplace `"bling"`).
- `get_product_by_sku_or_bling`: select `Product` by `sku == sku` or (`sku` nil) by `bling_id == bling_id`; returns `None` if no match.
- `upsert_order`: find by external; if new create `Order` + `OrderItem`s (cascade via relationship), each item's `product_id` resolved via `get_product_by_sku_or_bling(dto.sku, dto.bling_id)` — if unresolvable, create the item with `product_id=None` flagged in the sync log as downstream job; if resolvable, populate `product_id`, `sku`, `product_name`, `quantity`, `unit_price`, `total_price`; else replace old `items` similarly.
- `start`: create `SyncLog(sync_type="full", entity=entity)` (default status `"running"`).
- `add_error`: create `SyncError(sync_log_id=log.id, entity=log.entity, external_id=..., error_type="item_failed", error_message=message)`.
- `finish_ok`: set `status="completed"`, `finished_at=now`, counts.
- `finish_failed`: set `status="failed"`, `finished_at=now`, `error_message`.

- [ ] **Step 1: Write the failing tests (repository, real Postgres)** — create `backend/tests/unit/modules/integration/test_sync_repository.py` using the existing `pg_engine`/`db_session` fixtures from `backend/tests/unit/modules/integration/conftest.py`:

```python
from datetime import UTC, datetime
from decimal import Decimal

import pytest

from backend.database.models.category import Category
from backend.modules.integration.dto import (
    CategoryDto,
    OrderDto,
    OrderItemDto,
    ProductDto,
)
from backend.modules.integration.sync_repository import (
    PostgresBlingSyncLogRepository,
    PostgresBlingSyncRepository,
)


@pytest.mark.asyncio
async def test_upsert_product_creates_then_updates(db_session: Any) -> None:
    repo = PostgresBlingSyncRepository(db_session)
    dto = ProductDto(
        id="10",
        sku="SKU-10",
        name="Produto 10",
        price=Decimal("1.00"),
        category_id="7",
        category_name="Roupas",
    )
    assert await repo.upsert_product(dto) == "created"
    updated = dto.model_copy(update={"price": Decimal("2.00")})
    assert await repo.upsert_product(updated) == "updated"
    product = await repo.get_product_by_bling_id("10")
    assert product is not None
    assert product.price == Decimal("2.00")
    assert product.category is not None
    assert product.category.bling_id == "7"


@pytest.mark.asyncio
async def test_get_product_by_sku_or_bling(db_session: Any) -> None:
    repo = PostgresBlingSyncRepository(db_session)
    await repo.upsert_product(
        ProductDto(id="20", sku="SKU-20", name="Produto 20", price=Decimal("1.00"))
    )
    by_sku = await repo.get_product_by_sku_or_bling("SKU-20", None)
    assert by_sku is not None and by_sku.bling_id == "20"
    by_bling = await repo.get_product_by_sku_or_bling(None, "20")
    assert by_bling is not None and by_bling.sku == "SKU-20"


@pytest.mark.asyncio
async def test_upsert_order_replaces_items_and_resolves_product(db_session: Any) -> None:
    repo = PostgresBlingSyncRepository(db_session)
    await repo.upsert_product(
        ProductDto(id="30", sku="SKU-30", name="Produto 30", price=Decimal("5.00"))
    )
    dto = OrderDto(
        id="O1",
        number="1",
        external_id="O1",
        ordered_at=datetime(2026, 1, 2, tzinfo=UTC),
        customer_name="Cliente",
        total=Decimal("20.00"),
        items=[OrderItemDto(sku="SKU-30", product_name="Produto 30", quantity=2, unit_price=Decimal("10.00"))],
    )
    assert await repo.upsert_order(dto) == "created"
    replaced = dto.model_copy(
        update={"items": [OrderItemDto(sku="SKU-30", product_name="Produto 30", quantity=1, unit_price=Decimal("5.00"))]}
    )
    assert await repo.upsert_order(replaced) == "updated"
    order = await repo.find_order_by_external("O1")
    assert order is not None
    assert len(order.items) == 1
    assert order.items[0].quantity == 1
    assert order.items[0].product_id is not None


@pytest.mark.asyncio
async def test_sync_log_lifecycle(db_session: Any) -> None:
    logs = PostgresBlingSyncLogRepository(db_session)
    log = await logs.start("products")
    assert log.status == "running"
    await logs.add_error(log, "999", "unexpected payload")
    await logs.finish_ok(log, processed=3, created=2, updated=1, failed=1)
    await db_session.refresh(log)
    assert log.status == "completed"
    assert len(log.errors) == 1
```

> Use the existing `db_session` fixture already defined in `backend/tests/unit/modules/integration/conftest.py` (no new fixture needed). Note: `Product` and `Category` models require a real Postgres engine because they live in the `operational` schema — do NOT run these against the aiosqlite fallback.

- [ ] **Step 2: Run, verify it fails**

Run: `python -m pytest backend/tests/unit/modules/integration/test_sync_repository.py -q`
Expected: ImportError — `backend.modules.integration.sync_repository` missing.

- [ ] **Step 3: Implement**

Create `backend/modules/integration/sync_repository.py`:

```python
from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.database.models.category import Category
from backend.database.models.order import Order, OrderItem
from backend.database.models.product import Product
from backend.database.models.sync import SyncError, SyncLog
from backend.modules.integration.dto import CategoryDto, OrderDto, ProductDto
from backend.modules.integration.ports import (
    IBlingSyncLogRepository,
    IBlingSyncRepository,
)

UNCATEGORIZED_ID = "0"


class PostgresBlingSyncRepository(IBlingSyncRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def _category_by_bling(self, bling_id: str) -> Category | None:
        stmt = select(Category).where(Category.bling_id == bling_id)
        return await self._session.scalar(stmt)

    async def _ensure_category(self, dto: CategoryDto) -> Category:
        existing = await self._category_by_bling(dto.id)
        if existing is not None:
            existing.name = dto.name
            return existing
        category = Category(bling_id=dto.id, name=dto.name)
        self._session.add(category)
        await self._session.flush()
        return category

    async def upsert_category(self, dto: CategoryDto) -> Literal["created", "updated"]:
        existing = await self._category_by_bling(dto.id)
        if existing is None:
            await self._ensure_category(dto)
            return "created"
        existing.name = dto.name
        await self._session.flush()
        return "updated"

    async def get_product_by_bling_id(self, bling_id: str) -> Product | None:
        stmt = select(Product).where(Product.bling_id == bling_id)
        return await self._session.scalar(stmt)

    async def get_product_by_sku_or_bling(
        self, sku: str | None, bling_id: str | None
    ) -> Product | None:
        if sku:
            stmt = select(Product).where(Product.sku == sku)
            product = await self._session.scalar(stmt)
            if product is not None:
                return product
        if bling_id:
            return await self.get_product_by_bling_id(bling_id)
        return None

    async def upsert_product(self, dto: ProductDto) -> Literal["created", "updated"]:
        category = await self._ensure_category(
            CategoryDto(id=dto.category_id or UNCATEGORIZED_ID, name=dto.category_name or "Sem categoria")
        )
        existing = await self.get_product_by_bling_id(dto.id)
        now = datetime.now(UTC)
        if existing is None:
            self._session.add(
                Product(
                    sku=dto.sku or dto.id,
                    bling_id=dto.id,
                    ean=dto.gtin,
                    name=dto.name,
                    description=dto.description,
                    brand=dto.brand,
                    category_id=category.id,
                    price=dto.price,
                    cost=dto.cost,
                    stock_quantity=dto.stock,
                    active=dto.active,
                    last_synced_at=now,
                )
            )
            await self._session.flush()
            return "created"
        existing.name = dto.name
        existing.sku = dto.sku or dto.id
        existing.ean = dto.gtin
        existing.description = dto.description
        existing.brand = dto.brand
        existing.category_id = category.id
        existing.price = dto.price
        existing.cost = dto.cost
        existing.stock_quantity = dto.stock
        existing.active = dto.active
        existing.last_synced_at = now
        await self._session.flush()
        return "updated"

    async def find_order_by_external(self, external_id: str) -> Order | None:
        stmt = (
            select(Order)
            .where(Order.external_id == external_id)
            .options(selectinload(Order.items))
        )
        return await self._session.scalar(stmt)

    async def upsert_order(self, dto: OrderDto) -> Literal["created", "updated"]:
        existing = await self.find_order_by_external(dto.external_id)
        now = datetime.now(UTC)

        async def _build_item(item: OrderItemDto) -> OrderItem:
            product = await self.get_product_by_sku_or_bling(item.sku, item.bling_id)
            if product is None:
                return OrderItem(
                    sku=item.sku or item.bling_id or "",
                    product_name=item.product_name or "",
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    total_price=item.unit_price * item.quantity - item.discount,
                    product_id=None,
                )
            return OrderItem(
                product_id=product.id,
                sku=product.sku,
                product_name=product.name,
                quantity=item.quantity,
                unit_price=item.unit_price,
                total_price=item.unit_price * item.quantity - item.discount,
            )

        if existing is None:
            order = Order(
                external_id=dto.external_id,
                marketplace="bling",
                order_number=dto.number,
                customer_name=dto.customer_name,
                customer_document=dto.customer_document,
                customer_email=dto.customer_email,
                customer_phone=dto.customer_phone,
                status=dto.status,
                total_amount=dto.total,
                shipping_amount=dto.shipping,
                discount_amount=dto.discount,
                payment_method=dto.payment_method,
                notes=dto.notes,
                ordered_at=dto.ordered_at,
                last_synced_at=now,
            )
            order.items = [await _build_item(item) for item in dto.items]
            self._session.add(order)
            await self._session.flush()
            return "created"
        existing.order_number = dto.number
        existing.customer_name = dto.customer_name
        existing.customer_document = dto.customer_document
        existing.customer_email = dto.customer_email
        existing.customer_phone = dto.customer_phone
        existing.status = dto.status
        existing.total_amount = dto.total
        existing.shipping_amount = dto.shipping
        existing.discount_amount = dto.discount
        existing.payment_method = dto.payment_method
        existing.notes = dto.notes
        existing.ordered_at = dto.ordered_at
        existing.last_synced_at = now
        existing.items.clear()
        for item in dto.items:
            existing.items.append(await _build_item(item))
        await self._session.flush()
        return "updated"


class PostgresBlingSyncLogRepository(IBlingSyncLogRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def start(self, entity: str) -> SyncLog:
        log = SyncLog(sync_type="full", entity=entity)
        self._session.add(log)
        await self._session.flush()
        return log

    async def add_error(
        self, log: SyncLog, external_id: str, message: str
    ) -> None:
        self._session.add(
            SyncError(
                sync_log_id=log.id,
                entity=log.entity,
                external_id=external_id,
                error_type="item_failed",
                error_message=message,
            )
        )
        await self._session.flush()

    async def finish_ok(
        self,
        log: SyncLog,
        processed: int,
        created: int,
        updated: int,
        failed: int,
    ) -> None:
        log.finished_at = datetime.now(UTC)
        log.status = "completed"
        log.items_processed = processed
        log.items_created = created
        log.items_updated = updated
        log.items_failed = failed
        await self._session.flush()

    async def finish_failed(self, log: SyncLog, message: str) -> None:
        log.finished_at = datetime.now(UTC)
        log.status = "failed"
        log.error_message = message
        await self._session.flush()
```

- [ ] **Step 4: Run, verify it passes**

Run (Docker up required): `python -m pytest backend/tests/unit/modules/integration/test_sync_repository.py -q`
Expected: PASS.

- [ ] **Step 5: Lint + mypy + commit**

Run: `ruff check backend/modules/integration/sync_repository.py` and `mypy backend/modules/integration/sync_repository.py`
Then: `git add -A && git commit -m "feat(integration): persist Bling sync via Postgres repository"`

---

### Task 6: Sync orchestration service

**Files:**
- Create: `backend/modules/integration/sync.py`
- Test: `backend/tests/unit/modules/integration/test_sync.py`

**Interfaces:**
- Consumes: Task 1 client (`fetch_products`, `fetch_orders`, `fetch_categories`), Task 3 mapper, Task 4 ports.
- Produces: `@dataclass SyncRunResult(entity, status, items_processed, items_created, items_updated, items_failed, error_message: str | None = None)`; `class BlingSyncService` with `async def sync_products() -> SyncRunResult`, `async def sync_orders() -> SyncRunResult`, `async def sync_categories() -> SyncRunResult`.

- [ ] **Step 1: Write the failing test (fakes, no DB)**

Create `backend/tests/unit/modules/integration/test_sync.py`:

```python
from collections.abc import Awaitable, Callable
from typing import Any

import pytest

from backend.modules.integration.dto import CategoryDto, ProductDto
from backend.modules.integration.sync import BlingSyncService


class StubSyncRepository:
    def __init__(self) -> None:
        self.created: dict[str, int] = {}

    async def upsert_product(self, dto: ProductDto) -> str:
        self.created["products"] = self.created.get("products", 0) + 1
        return "created"

    async def upsert_category(self, dto: CategoryDto) -> str:
        self.created["categories"] = self.created.get("categories", 0) + 1
        return "created"

    async def upsert_order(self, dto: Any) -> str:
        self.created["orders"] = self.created.get("orders", 0) + 1
        return "created"

    async def get_product_by_bling_id(self, bling_id: str) -> Any:
        return None

    async def find_order_by_external(self, external_id: str) -> Any:
        return None


class StubSyncLogRepository:
    def __init__(self) -> None:
        self.started: list[str] = []
        self.finished_ok = 0

    async def start(self, entity: str) -> Any:
        self.started.append(entity)
        return {"entity": entity}

    async def add_error(self, log: Any, external_id: str, message: str) -> None:
        pass

    async def finish_ok(
        self, log: Any, processed: int, created: int, updated: int, failed: int
    ) -> None:
        self.finished_ok += 1

    async def finish_failed(self, log: Any, message: str) -> None:
        pass


class StubClient:
    async def fetch_products(
        self,
        token_provider: Callable[[], Awaitable[str]],
        *,
        page_size: int = 100,
    ) -> list[dict[str, Any]]:
        return [
            {"id": 1, "codigo": "SKU-1", "nome": "Produto A", "preco": 9.9}
        ]

    async def fetch_orders(
        self,
        token_provider: Callable[[], Awaitable[str]],
        *,
        page_size: int = 100,
        data_inicial: str | None = None,
        data_final: str | None = None,
    ) -> list[dict[str, Any]]:
        return [
            {
                "id": 10,
                "numero": "1",
                "data": "2026-01-02T00:00:00Z",
                "contato": {"nome": "Cliente"},
            }
        ]

    async def fetch_categories(
        self, token_provider: Callable[[], Awaitable[str]]
    ) -> list[dict[str, Any]]:
        return [{"id": 3, "descricao": "Vestidos"}]


def _token() -> str:
    return "jwt"


@pytest.mark.asyncio
async def test_sync_products_uses_mapper_and_reports() -> None:
    repo = StubSyncRepository()
    logs = StubSyncLogRepository()
    service = BlingSyncService(repo=repo, log_repo=logs, client=StubClient(), token_provider=_token)

    result = await service.sync_products()

    assert result.status == "completed"
    assert result.items_processed == 1
    assert result.items_created == 1
    assert result.items_failed == 0
    assert logs.started == ["products"]
    assert logs.finished_ok == 1


@pytest.mark.asyncio
async def test_sync_orders_counts_created_orders() -> None:
    repo = StubSyncRepository()
    logs = StubSyncLogRepository()
    service = BlingSyncService(repo=repo, log_repo=logs, client=StubClient(), token_provider=_token)

    result = await service.sync_orders()

    assert result.items_created == 1
    assert result.items_failed == 0


@pytest.mark.asyncio
async def test_item_failure_is_logged_and_run_completes() -> None:
    repo = StubSyncRepository()
    logs = StubSyncLogRepository()

    class BrokenClient(StubClient):
        async def fetch_products(
            self, token_provider: Callable[[], Awaitable[str]], *, page_size: int = 100
        ) -> list[dict[str, Any]]:
            return [{"nome": "Sem id"}]

    service = BlingSyncService(repo=repo, log_repo=logs, client=BrokenClient(), token_provider=_token)
    result = await service.sync_products()

    assert result.status == "completed"
    assert result.items_processed == 1
    assert result.items_failed == 1
    assert result.items_created == 0
```

- [ ] **Step 2: Run, verify it fails**

Run: `python -m pytest backend/tests/unit/modules/integration/test_sync.py -q`
Expected: ImportError — `backend.modules.integration.sync` missing.

- [ ] **Step 3: Implement the service**

Create `backend/modules/integration/sync.py`:

```python
from __future__ import annotations

import traceback
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any

from backend.modules.integration.mapper import (
    parse_category,
    parse_order,
    parse_product,
)
from backend.modules.integration.ports import (
    IBlingSyncLogRepository,
    IBlingSyncRepository,
)


@dataclass(frozen=True)
class SyncRunResult:
    entity: str
    status: str
    items_processed: int = 0
    items_created: int = 0
    items_updated: int = 0
    items_failed: int = 0
    error_message: str | None = None


class BlingSyncService:
    def __init__(
        self,
        repo: IBlingSyncRepository,
        log_repo: IBlingSyncLogRepository,
        client: Any,
        token_provider: Callable[[], Awaitable[str]],
        *,
        page_size: int = 100,
        order_data_inicial: str | None = None,
        order_data_final: str | None = None,
    ) -> None:
        self._repo = repo
        self._log_repo = log_repo
        self._client = client
        self._token_provider = token_provider
        self._page_size = page_size
        self._order_data_inicial = order_data_inicial
        self._order_data_final = order_data_final

    async def sync_products(self) -> SyncRunResult:
        return await self._sync("products", parse_product, self._repo.upsert_product)

    async def sync_categories(self) -> SyncRunResult:
        return await self._sync("categories", parse_category, self._repo.upsert_category)

    async def sync_orders(self) -> SyncRunResult:
        return await self._sync("orders", parse_order, self._repo.upsert_order)

    async def _sync(
        self,
        entity: str,
        parse: Callable[[dict[str, Any]], Any],
        persist: Callable[[Any], Awaitable[str]],
    ) -> SyncRunResult:
        log = await self._log_repo.start(entity)
        processed = created = updated = failed = 0
        try:
            fetch = getattr(self._client, f"fetch_{entity}")
            if entity == "orders":
                items = await fetch(
                    self._token_provider,
                    page_size=self._page_size,
                    data_inicial=self._order_data_inicial,
                    data_final=self._order_data_final,
                )
            elif entity == "categories":
                items = await fetch(self._token_provider)
            else:
                items = await fetch(self._token_provider, page_size=self._page_size)
        except Exception as exc:
            detail = traceback.format_exc()
            await self._log_repo.finish_failed(log, detail)
            return SyncRunResult(entity=entity, status="failed", error_message=str(exc))

        for item in items:
            try:
                dto = parse(item)
                outcome = await persist(dto)
            except Exception:
                failed += 1
                external_id = str(item.get("id", "")) if isinstance(item, dict) else ""
                await self._log_repo.add_error(log, external_id, "item_failed")
                continue
            if outcome == "created":
                created += 1
            else:
                updated += 1
            processed += 1

        await self._log_repo.finish_ok(
            log, processed=processed, created=created, updated=updated, failed=failed
        )
        return SyncRunResult(
            entity=entity,
            status="completed",
            items_processed=processed,
            items_created=created,
            items_updated=updated,
            items_failed=failed,
        )
```

- [ ] **Step 4: Run, verify it passes**

Run: `python -m pytest backend/tests/unit/modules/integration/test_sync.py -q`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

Run: `ruff check backend/modules/integration/sync.py`
Then: `git add -A && git commit -m "feat(integration): add Bling sync orchestration service"`

---

### Task 7: Settings, DI, router, main wiring

**Files:**
- Modify: `backend/core/config/base.py`
- Modify: `backend/modules/integration/di.py`
- Modify: `backend/modules/integration/schemas.py`
- Modify: `backend/modules/integration/router.py`
- Modify: `backend/main.py`
- Test: `backend/tests/unit/modules/integration/test_sync_router.py`

**Interfaces:**
- Consumes: Task 5 `PostgresBlingSyncRepository`, `PostgresBlingSyncLogRepository`; Task 6 `BlingSyncService`, `SyncRunResult`.
- Produces: settings `BLING_SYNC_PAGE_SIZE: int = 100`, `BLING_ORDER_SYNC_DAYS_BACK: int = 7`; DI `get_bling_sync_service`; schema `SyncResponse`; routes `POST /integrations/bling/sync/{entity}` (admin-protected); main includes the router (already included).

- [ ] **Step 1: Write the failing router test**

Create `backend/tests/unit/modules/integration/test_sync_router.py` (mirror `test_router.py` patterns; override `get_bling_sync_service`):

```python
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from backend.core.config import get_settings
from backend.core.config.base import Settings
from backend.modules.integration.di import get_bling_sync_service
from backend.modules.integration.sync import SyncRunResult

ADMIN_USERNAME = "royale-admin"
ADMIN_PASSWORD = "test-admin-password"
ADMIN_AUTH = (ADMIN_USERNAME, ADMIN_PASSWORD)


class StubSyncService:
    async def sync_products(self) -> SyncRunResult:
        return SyncRunResult(entity="products", status="completed")

    async def sync_orders(self) -> SyncRunResult:
        return SyncRunResult(entity="orders", status="completed")


def _create_app(settings: Settings) -> FastAPI:
    from backend.main import create_app

    application = create_app()
    application.dependency_overrides[get_settings] = lambda: settings
    application.dependency_overrides[get_bling_sync_service] = lambda: StubSyncService()
    return application


@asynccontextmanager
async def _client(settings: Settings) -> AsyncIterator[AsyncClient]:
    app = _create_app(settings)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def sync_client(settings: Settings) -> AsyncIterator[AsyncClient]:
    async with _client(settings) as ac:
        yield ac


async def test_sync_products_requires_admin_auth(sync_client: AsyncClient) -> None:
    response = await sync_client.post("/integrations/bling/sync/products")
    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Basic"


async def test_sync_products_with_auth_returns_summary(sync_client: AsyncClient) -> None:
    response = await sync_client.post(
        "/integrations/bling/sync/products", auth=ADMIN_AUTH
    )
    assert response.status_code == 200
    assert response.json()["entity"] == "products"
    assert response.json()["status"] == "completed"


async def test_sync_orders_with_auth_returns_summary(sync_client: AsyncClient) -> None:
    response = await sync_client.post("/integrations/bling/sync/orders", auth=ADMIN_AUTH)
    assert response.status_code == 200
    assert response.json()["entity"] == "orders"
```

- [ ] **Step 2: Run, verify it fails**

Run: `python -m pytest backend/tests/unit/modules/integration/test_sync_router.py -q`
Expected: 401s / route-not-found until the wiring below exists.

- [ ] **Step 3: Implement wiring**

`backend/core/config/base.py` — inside `Settings`:

```python
BLING_SYNC_PAGE_SIZE: int = 100
BLING_ORDER_SYNC_DAYS_BACK: int = 7
```

`backend/modules/integration/schemas.py` — append:

```python
class SyncResponse(BaseModel):
    entity: str
    status: str
    items_processed: int
    items_created: int
    items_updated: int
    items_failed: int
    error_message: str | None = None
```

`backend/modules/integration/di.py` — add:

```python
from datetime import datetime, timedelta

from backend.modules.integration.service import IntegrationConnectionService
from backend.modules.integration.sync import BlingSyncService
from backend.modules.integration.sync_repository import (
    PostgresBlingSyncLogRepository,
    PostgresBlingSyncRepository,
)


def get_bling_sync_repository(
    session: AsyncSession = Depends(get_db_session),
) -> PostgresBlingSyncRepository:
    return PostgresBlingSyncRepository(session)


def get_bling_sync_log_repository(
    session: AsyncSession = Depends(get_db_session),
) -> PostgresBlingSyncLogRepository:
    return PostgresBlingSyncLogRepository(session)


async def get_bling_sync_service(
    repo: PostgresBlingSyncRepository = Depends(get_bling_sync_repository),
    log_repo: PostgresBlingSyncLogRepository = Depends(get_bling_sync_log_repository),
    client: BlingApiClient = Depends(get_bling_api_client),
    connection: IntegrationConnectionService = Depends(get_integration_connection_service),
    settings: Settings = Depends(get_settings),
) -> AsyncGenerator[BlingSyncService, None]:
    data_final = datetime.now()
    data_inicial = data_final - timedelta(days=settings.BLING_ORDER_SYNC_DAYS_BACK)
    service = BlingSyncService(
        repo=repo,
        log_repo=log_repo,
        client=client,
        token_provider=connection.get_valid_access_token,
        page_size=settings.BLING_SYNC_PAGE_SIZE,
        order_data_inicial=data_inicial.strftime("%Y-%m-%d"),
        order_data_final=data_final.strftime("%Y-%m-%d"),
    )
    yield service
```

`backend/modules/integration/router.py` — add (keeps `require_admin_auth`; callback stays public):

```python
from fastapi import APIRouter, Depends, HTTPException, status

router = APIRouter(prefix="/integrations/bling", tags=["integrations"])

# ...existing /authorize, /callback, /status, /disconnect, /test stay exactly as-is...

from backend.modules.integration.di import get_bling_sync_service
from backend.modules.integration.schemas import SyncResponse
from backend.modules.integration.sync import BlingSyncService, SyncRunResult


@router.post(
    "/sync/{entity}",
    response_model=SyncResponse,
    dependencies=[Depends(require_admin_auth)],
)
async def trigger_sync(
    entity: str,
    service: BlingSyncService = Depends(get_bling_sync_service),
) -> SyncResponse:
    if entity == "products":
        result = await service.sync_products()
    elif entity == "orders":
        result = await service.sync_orders()
    elif entity == "categories":
        result = await service.sync_categories()
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="entity must be one of products, orders, categories",
        )
    return SyncResponse(
        entity=result.entity,
        status=result.status,
        items_processed=result.items_processed,
        items_created=result.items_created,
        items_updated=result.items_updated,
        items_failed=result.items_failed,
        error_message=result.error_message,
    )
```

(Keep the imports inside `router.py` at the top — do not add mid-file imports in the final code; this snippet is advisory about placement.)

`backend/main.py` — `integration_router` is already included; no change required (verify).

- [ ] **Step 4: Run, verify it passes**

Run (Docker not required — stub service overrides DB deps):
`python -m pytest backend/tests/unit/modules/integration/test_sync_router.py -q`
Expected: PASS (3 tests). If the error surfaces ONLY because the DI import chain itself requires DB, keep the stub override and the app-lifespan clean; do not instantiate a real `BlingSyncService` in the router test.

- [ ] **Step 5: Lint + full verification + commit**

Run:
- `ruff check backend`
- `mypy backend/modules/integration`
- `python -m pytest backend/tests -q` (accept the known container-backed errors when Docker is down; require the new pure unit tests to pass and no NEW errors outside pre-existing Docker-dependent suites)
- `git add -A && git commit -m "feat(integration): expose Bling sync endpoints"`

---

### Task 8: Full-suite verification + memory update

**Files:**
- Modify: `.opencode/memory.md` (repo root project memory)

**Interfaces:**
- None new. Recaps Tasks 1-7 deliverables.

- [ ] **Step 1: Run the complete quality gates**

Run: `python -m pytest backend/tests -q`
Then: `ruff check backend`
Then: `mypy backend` (compare against baseline: `5` errors — do not add new ones)
Then: `bandit -r backend --skip B110` (baseline `2` findings B110)
Then: `import-linter lint` by running `lint-imports`/`import-linter` script per the project Makefile/scripts (`scripts/lint.sh`).

- [ ] **Step 2: Confirm behavior end-to-end (best-effort)**

If a real Bling connection exists (token in the production env file), run:
`alembic upgrade head` (via `scripts/migrate.sh`), then trigger `POST /integrations/bling/sync/products` with admin Basic auth and confirm counts + `sync_logs` row. Otherwise document as manual step in memory.

- [ ] **Step 3: Update project memory**

Append a session block to `.opencode/memory.md`:

```markdown
## Ultima Sessao (2026-08-12)
- **O que foi feito:** Implementada a camada de sincronizacao Bling v3 (PR apos #010). Adicionados a `BlingApiClient` os metodos `list_resource`/`fetch_products`/`fetch_categories`/`fetch_orders` com paginacao e retry. Criados `dto.py`, `mapper.py` (normalizacao de payloads), `sync_repository.py` (upsert de categories/products/orders + SyncLog/SyncError), `sync.py` (orquestracao com SyncRunResult). Novos endpoints admin `POST /integrations/bling/sync/{products|orders|categories}`. Settings `BLING_SYNC_PAGE_SIZE` e `BLING_ORDER_SYNC_DAYS_BACK`.
- **Proximos passos:** Ativar token_provider real no DI (usar `IntegrationConnectionService.get_valid_access_token`), executar sync real contra o Bling conectado, decidir mapeamento de itens de pedido para `product_id` (FK) quando houver catalog sincronizado, e expor a mesma rota no scheduler (Celery beat).
```

- [ ] **Step 4: Commit memory**

Run: `git add -A && git commit -m "docs: record Bling sync layer session"`

---

## Self-Review Notes (verify before executing)

1. **Spec coverage** — Sprint 1 items covered: module `bling` client fetch, catalog/order persistence, ETL pipeline (mapper→repo), integration tests, endpoints. Scheduler (Celery beat) explicitly deferred to a follow-up (documented in memory task).
2. **No placeholders** — every code step above is complete; the only intentional TODO blocks are in **Task 7 DI** and tagged for the executor (they were kept visible intentionally so execution commits to the real wiring).
3. **Type consistency** — `IBlingSyncRepository` methods (`get_product_by_bling_id`, `upsert_product`, `upsert_category`, `find_order_by_external`, `upsert_order`) match across Task 4/5/6; `IBlingSyncLogRepository` (`start`, `add_error`, `finish_ok`, `finish_failed`) match Task 5/6; router uses `SyncRunResult` fields exactly.
4. **import-linter** — `sync_repository.py` imports only `backend.database.*` + `backend.core.*` + integration module; `sync.py` only integration module + `backend.core` imports via mapper (none); `di.py` and `router.py` stay within integration module. No cross-module `backend.modules.*` imports added.