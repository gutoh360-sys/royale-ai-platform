from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config.base import Settings
from backend.database.models.product import Product
from backend.database.models.sync import SyncLog
from backend.modules.integration.client import BlingApiClient
from backend.modules.integration.sync_repository import (
    PostgresSyncLogRepository,
    SyncDataRepository,
)
from backend.modules.integration.sync_service import (
    UNCATEGORIZED_ID,
    UNCATEGORIZED_NAME,
    BlingSyncService,
)


def _products_payload() -> dict[str, Any]:
    return {
        "data": [
            {
                "id": 1,
                "codigo": "SKU-001",
                "nome": "Produto Um",
                "descricao": "Descricao",
                "gtin": "7891234567890",
                "situacao": "A",
                "categoria": {"id": 11, "descricao": "Categoria Um"},
                "preco": {"custo": "10.00", "venda": "29.90"},
                "estoque": {"saldo": 5},
            },
            {
                "id": 2,
                "codigo": "SKU-002",
                "nome": "Produto Dois",
                "categoria": {"id": 12, "descricao": "Categoria Dois"},
                "preco": 15.00,
            },
            {"id": 3, "codigo": "SKU-003", "nome": "Sem Categoria"},
            {"id": 4, "codigo": "", "nome": "Sem SKU"},
        ],
        "response": {"paginacao": {"pagina": 1, "limite": 100, "totalPaginas": 1}},
    }


def _make_client(
    settings: Settings,
    payload: dict[str, Any],
) -> BlingApiClient:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=payload)

    transport = httpx.MockTransport(handler)
    http = httpx.AsyncClient(transport=transport, timeout=httpx.Timeout(1.0))
    return BlingApiClient(settings, client=http)


async def _token_provider() -> str:
    return "token"


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


async def test_sync_products_creates_and_maps(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    client = _make_client(settings, _products_payload())
    service = await _make_service(db_session, client, settings)

    result = await service.sync_products(sync_type="full")
    await db_session.commit()

    assert result.status == "completed"
    assert result.items_processed == 3
    assert result.items_created == 3
    assert result.items_updated == 0
    assert result.items_failed == 1

    products = (await db_session.execute(select(Product))).scalars().all()
    assert len(products) == 3
    sku_001 = next(p for p in products if p.sku == "SKU-001")
    assert sku_001.bling_id == "1"
    assert sku_001.name == "Produto Um"
    assert float(sku_001.price) == 29.90
    assert sku_001.stock_quantity == 5

    sem_categoria = await db_session.scalar(
        select(Product).where(Product.sku == "SKU-003")
    )
    assert sem_categoria is not None
    assert sem_categoria.category is not None
    assert sem_categoria.category.bling_id == UNCATEGORIZED_ID
    assert sem_categoria.category_id == sem_categoria.category.id

    log = await db_session.scalar(
        select(SyncLog).where(SyncLog.entity == "products").order_by(SyncLog.started_at.desc())
    )
    assert log is not None
    assert log.status == "completed"
    assert log.items_created == 3
    assert log.items_failed == 1


async def test_sync_products_reuses_uncategorized_category(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    from backend.database.models.category import Category

    payload = _products_payload()
    client = _make_client(settings, payload)
    service = await _make_service(db_session, client, settings)
    await service.sync_products()
    await db_session.commit()

    first = await db_session.scalar(
        select(Category).where(Category.bling_id == UNCATEGORIZED_ID)
    )
    assert first is not None

    payload["data"] = [{"id": 5, "codigo": "SKU-005", "nome": "Outro Sem Categoria"}]
    client = _make_client(settings, payload)
    service = await _make_service(db_session, client, settings)
    await service.sync_products()
    await db_session.commit()

    categories = (
        await db_session.execute(select(Category).where(Category.name == UNCATEGORIZED_NAME))
    ).scalars().all()
    assert len(categories) == 1
    assert categories[0].id == first.id
    outro = await db_session.scalar(select(Product).where(Product.sku == "SKU-005"))
    assert outro is not None
    assert outro.category_id == first.id


async def test_sync_products_updates_existing(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    payload = _products_payload()
    client = _make_client(settings, payload)
    service = await _make_service(db_session, client, settings)
    await service.sync_products()
    await db_session.commit()

    payload["data"][0]["preco"] = 39.90
    client = _make_client(settings, payload)
    service = await _make_service(db_session, client, settings)
    result = await service.sync_products()
    await db_session.commit()

    assert result.items_created == 0
    assert result.items_updated == 3
    product = await db_session.scalar(select(Product).where(Product.sku == "SKU-001"))
    assert product is not None
    assert float(product.price) == 39.90


async def test_sync_orders_empty_payload_completes(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    client = _make_client(settings, {"data": [], "response": {}})
    service = await _make_service(db_session, client, settings)

    result = await service.sync_orders()
    await db_session.commit()

    assert result.status == "completed"
    assert result.items_processed == 0
    log = await db_session.scalar(
        select(SyncLog).where(SyncLog.entity == "orders").order_by(SyncLog.started_at.desc())
    )
    assert log is not None
    assert log.sync_type == "incremental"


async def test_sync_api_error_marks_log_failed(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, json={})

    transport = httpx.MockTransport(handler)
    http = httpx.AsyncClient(transport=transport, timeout=httpx.Timeout(1.0))
    client = BlingApiClient(settings, client=http)
    service = await _make_service(db_session, client, settings)

    result = await service.sync_products()
    await db_session.commit()

    assert result.status == "failed"
    assert result.items_processed == 0


async def test_sync_orders_persists_order_and_items(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    from backend.database.models.order import Order

    service = await _make_service(db_session, _make_client(settings, _products_payload()), settings)
    await service.sync_products()
    await db_session.commit()

    payload = {
        "data": [
            {
                "id": 9001,
                "numero": "1001",
                "data": "2026-01-02T10:00:00-03:00",
                "contato": {"nome": "Cliente A", "email": "a@example.com"},
                "total": {"valor": 100.0, "desconto": 10.0, "frete": 5.0},
                "itens": [
                    {"codigo": "SKU-001", "quantidade": 2, "valor": 50.0}
                ],
            }
        ],
        "response": {"paginacao": {"pagina": 1, "limite": 100, "totalPaginas": 1}},
    }
    client = _make_client(settings, payload)
    service = await _make_service(db_session, client, settings)
    result = await service.sync_orders()
    await db_session.commit()

    assert result.status == "completed"
    assert result.items_created == 1
    order = await db_session.scalar(select(Order).where(Order.external_id == "9001"))
    assert order is not None
    assert order.order_number == "1001"
    assert order.customer_email == "a@example.com"
    assert float(order.total_amount) == 100.0
    assert order.last_synced_at is not None
    assert order.items
    assert order.items[0].product is not None
    assert order.items[0].sku == "SKU-001"


async def test_sync_orders_item_without_product_is_failed(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    payload = {
        "data": [
            {
                "id": 9002,
                "numero": "1002",
                "contato": {"nome": "Cliente B"},
                "total": {"valor": 20.0},
                "itens": [
                    {"codigo": "UNKNOWN-SKU", "quantidade": 1, "valor": 20.0}
                ],
            }
        ],
        "response": {"paginacao": {"pagina": 1, "limite": 100, "totalPaginas": 1}},
    }
    client = _make_client(settings, payload)
    service = await _make_service(db_session, client, settings)
    result = await service.sync_orders()
    await db_session.commit()

    assert result.status == "completed"
    assert result.items_failed == 1
    log = await db_session.scalar(
        select(SyncLog).where(SyncLog.entity == "orders").order_by(SyncLog.started_at.desc())
    )
    assert log is not None
    assert log.items_failed == 1
