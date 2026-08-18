from decimal import Decimal
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
                "estoque": {"saldoVirtualTotal": 5},
            },
            {
                "id": 2,
                "codigo": "SKU-002",
                "nome": "Produto Dois",
                "categoria": {"id": 12, "descricao": "Categoria Dois"},
                "preco": 15.00,
            },
            {"id": 3, "codigo": "SKU-003", "nome": "Sem Categoria"},
            {"id": None, "codigo": "SKU-004", "nome": "Sem ID"},
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
    assert result.items_failed == 0
    assert result.items_skipped == 1

    products = (await db_session.execute(select(Product))).scalars().all()
    assert len(products) == 3
    sku_001 = next(p for p in products if p.sku == "SKU-001")
    assert sku_001.bling_id == "1"
    assert sku_001.name == "Produto Um"
    assert float(sku_001.price) == 29.90
    assert sku_001.stock_quantity == 5

    sem_categoria = await db_session.scalar(select(Product).where(Product.sku == "SKU-003"))
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
    assert log.items_failed == 0


async def test_sync_products_skips_missing_sku_and_name_without_fallback(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    payload = {
        "data": [{"id": 1818520548, "codigo": "", "nome": "", "preco": 0}],
        "response": {"paginacao": {"pagina": 1, "limite": 100, "totalPaginas": 1}},
    }
    client = _make_client(settings, payload)
    service = await _make_service(db_session, client, settings)

    result = await service.sync_products(sync_type="full")
    await db_session.commit()

    assert result.items_processed == 0
    assert result.items_created == 0
    assert result.items_failed == 0
    assert result.items_skipped == 1
    assert await db_session.scalar(select(Product).where(Product.bling_id == "1818520548")) is None
    assert await db_session.scalar(select(Product).where(Product.sku.startswith("BLING-"))) is None


async def test_sync_products_skips_missing_codigo(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    payload = {
        "data": [{"id": 20, "codigo": "", "nome": "Produto Sem SKU"}],
        "response": {"paginacao": {"pagina": 1, "limite": 100, "totalPaginas": 1}},
    }
    service = await _make_service(db_session, _make_client(settings, payload), settings)
    result = await service.sync_products(sync_type="full")
    await db_session.commit()

    assert result.items_skipped == 1
    assert result.items_created == 0
    assert await db_session.scalar(select(Product).where(Product.bling_id == "20")) is None


async def test_sync_products_skips_missing_nome(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    payload = {
        "data": [{"id": 21, "codigo": "SKU-021", "nome": ""}],
        "response": {"paginacao": {"pagina": 1, "limite": 100, "totalPaginas": 1}},
    }
    service = await _make_service(db_session, _make_client(settings, payload), settings)
    result = await service.sync_products(sync_type="full")
    await db_session.commit()

    assert result.items_skipped == 1
    assert result.items_created == 0
    assert await db_session.scalar(select(Product).where(Product.bling_id == "21")) is None


async def test_sync_products_skips_missing_bling_id(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    payload = {
        "data": [{"id": None, "codigo": "SKU-022", "nome": "Sem Bling ID"}],
        "response": {"paginacao": {"pagina": 1, "limite": 100, "totalPaginas": 1}},
    }
    service = await _make_service(db_session, _make_client(settings, payload), settings)
    result = await service.sync_products(sync_type="full")
    await db_session.commit()

    assert result.items_skipped == 1
    assert result.items_created == 0
    assert await db_session.scalar(select(Product).where(Product.sku == "SKU-022")) is None


async def test_sync_products_skips_whitespace_only_fields(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    payload = {
        "data": [{"id": "23", "codigo": "   ", "nome": "   "}],
        "response": {"paginacao": {"pagina": 1, "limite": 100, "totalPaginas": 1}},
    }
    service = await _make_service(db_session, _make_client(settings, payload), settings)
    result = await service.sync_products(sync_type="full")
    await db_session.commit()

    assert result.items_skipped == 1


async def test_sync_products_incomplete_does_not_update_existing(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    payload = {
        "data": [{"id": 99, "codigo": "SKU-099", "nome": "Produto Existente"}],
        "response": {"paginacao": {"pagina": 1, "limite": 100, "totalPaginas": 1}},
    }
    service = await _make_service(db_session, _make_client(settings, payload), settings)
    await service.sync_products(sync_type="full")
    await db_session.commit()

    payload["data"] = [{"id": 99, "codigo": "", "nome": ""}]
    service = await _make_service(db_session, _make_client(settings, payload), settings)
    result = await service.sync_products(sync_type="full")
    await db_session.commit()

    assert result.items_updated == 0
    assert result.items_failed == 0
    assert result.items_skipped == 1
    product = await db_session.scalar(select(Product).where(Product.bling_id == "99"))
    assert product is not None
    assert product.sku == "SKU-099"
    assert product.name == "Produto Existente"


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

    first = await db_session.scalar(select(Category).where(Category.bling_id == UNCATEGORIZED_ID))
    assert first is not None

    payload["data"] = [{"id": 5, "codigo": "SKU-005", "nome": "Outro Sem Categoria"}]
    client = _make_client(settings, payload)
    service = await _make_service(db_session, client, settings)
    await service.sync_products()
    await db_session.commit()

    categories = (
        (await db_session.execute(select(Category).where(Category.name == UNCATEGORIZED_NAME)))
        .scalars()
        .all()
    )
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


async def test_sync_products_without_stock_creates_zero(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    payload = {
        "data": [{"id": 30, "codigo": "SKU-030", "nome": "Sem Estoque"}],
        "response": {"paginacao": {"pagina": 1, "limite": 100, "totalPaginas": 1}},
    }
    service = await _make_service(db_session, _make_client(settings, payload), settings)
    result = await service.sync_products(sync_type="full")
    await db_session.commit()

    assert result.items_created == 1
    assert result.items_skipped == 0
    product = await db_session.scalar(select(Product).where(Product.bling_id == "30"))
    assert product is not None
    assert product.stock_quantity == 0


async def test_sync_products_with_zero_stock_creates_zero(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    payload = {
        "data": [
            {
                "id": 31,
                "codigo": "SKU-031",
                "nome": "Estoque Zero",
                "estoque": {"saldoVirtualTotal": 0},
            }
        ],
        "response": {"paginacao": {"pagina": 1, "limite": 100, "totalPaginas": 1}},
    }
    service = await _make_service(db_session, _make_client(settings, payload), settings)
    result = await service.sync_products(sync_type="full")
    await db_session.commit()

    assert result.items_created == 1
    product = await db_session.scalar(select(Product).where(Product.bling_id == "31"))
    assert product is not None
    assert product.stock_quantity == 0


async def test_sync_products_with_positive_virtual_stock_creates_quantity(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    payload = {
        "data": [
            {
                "id": 32,
                "codigo": "SKU-032",
                "nome": "Com Estoque",
                "estoque": {"saldoVirtualTotal": 7},
            }
        ],
        "response": {"paginacao": {"pagina": 1, "limite": 100, "totalPaginas": 1}},
    }
    service = await _make_service(db_session, _make_client(settings, payload), settings)
    result = await service.sync_products(sync_type="full")
    await db_session.commit()

    assert result.items_created == 1
    product = await db_session.scalar(select(Product).where(Product.bling_id == "32"))
    assert product is not None
    assert product.stock_quantity == 7


async def test_sync_products_stock_ignores_legacy_saldo_field(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    payload = {
        "data": [{"id": 33, "codigo": "SKU-033", "nome": "Saldo Legado", "estoque": {"saldo": 99}}],
        "response": {"paginacao": {"pagina": 1, "limite": 100, "totalPaginas": 1}},
    }
    service = await _make_service(db_session, _make_client(settings, payload), settings)
    result = await service.sync_products(sync_type="full")
    await db_session.commit()

    assert result.items_created == 1
    product = await db_session.scalar(select(Product).where(Product.bling_id == "33"))
    assert product is not None
    assert product.stock_quantity == 0


async def test_sync_products_inactive_complete_created_as_inactive(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    payload = {
        "data": [{"id": 40, "codigo": "SKU-040", "nome": "Inativo", "situacao": "I"}],
        "response": {"paginacao": {"pagina": 1, "limite": 100, "totalPaginas": 1}},
    }
    service = await _make_service(db_session, _make_client(settings, payload), settings)
    result = await service.sync_products(sync_type="full")
    await db_session.commit()

    assert result.items_created == 1
    assert result.items_skipped == 0
    product = await db_session.scalar(select(Product).where(Product.bling_id == "40"))
    assert product is not None
    assert product.active is False


async def test_sync_products_incomplete_does_not_interrupt_pagination(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    pages: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        page = request.url.params["pagina"]
        pages.append(page)
        if page == "1":
            return httpx.Response(
                200,
                json={
                    "data": [
                        {"id": i, "codigo": f"SKU-{i}", "nome": f"P{i}"} for i in range(1, 101)
                    ]
                },
            )
        return httpx.Response(
            200,
            json={
                "data": [
                    {"id": 101, "codigo": "", "nome": ""},
                    {"id": 102, "codigo": "SKU-102", "nome": "Pagina Dois"},
                ]
            },
        )

    transport = httpx.MockTransport(handler)
    http = httpx.AsyncClient(transport=transport, timeout=httpx.Timeout(1.0))
    client = BlingApiClient(settings, client=http)
    service = await _make_service(db_session, client, settings)

    result = await service.sync_products(sync_type="full")
    await db_session.commit()

    assert pages == ["1", "2"]
    assert result.items_created == 101
    assert result.items_skipped == 1
    assert result.items_failed == 0
    produto_pagina_2 = await db_session.scalar(select(Product).where(Product.bling_id == "102"))
    assert produto_pagina_2 is not None
    assert produto_pagina_2.name == "Pagina Dois"


async def test_sync_products_incomplete_records_sync_error_with_reason(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    from backend.database.models.sync import SyncError

    payload: dict[str, Any] = {
        "data": [{"id": 50, "codigo": "", "nome": "Sem SKU"}],
        "response": {"paginacao": {"pagina": 1, "limite": 100, "totalPaginas": 1}},
    }
    service = await _make_service(db_session, _make_client(settings, payload), settings)
    result = await service.sync_products(sync_type="full")
    await db_session.commit()

    assert result.items_skipped == 1
    error = await db_session.scalar(select(SyncError))
    assert error is not None
    assert error.error_type == "product_incomplete"
    assert error.error_message == "product is missing codigo"
    assert error.raw_data == payload["data"][0]


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
                "itens": [{"codigo": "SKU-001", "quantidade": 2, "valor": 50.0}],
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


async def test_sync_orders_item_without_product_keeps_order_and_records_error(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    from backend.database.models.order import Order
    from backend.database.models.sync import SyncError

    payload = {
        "data": [
            {
                "id": 9002,
                "numero": "1002",
                "contato": {"nome": "Cliente B"},
                "total": {"valor": 20.0},
                "itens": [{"codigo": "UNKNOWN-SKU", "quantidade": 1, "valor": 20.0}],
            }
        ],
        "response": {"paginacao": {"pagina": 1, "limite": 100, "totalPaginas": 1}},
    }
    client = _make_client(settings, payload)
    service = await _make_service(db_session, client, settings)
    result = await service.sync_orders()
    await db_session.commit()

    assert result.status == "completed"
    assert result.items_failed == 0
    assert result.items_skipped == 0
    order = await db_session.scalar(select(Order).where(Order.external_id == "9002"))
    assert order is not None
    assert order.items == []
    error = await db_session.scalar(select(SyncError))
    assert error is not None
    assert error.error_type == "order_item_unknown_product"
    assert error.entity == "orders"
    log = await db_session.scalar(
        select(SyncLog).where(SyncLog.entity == "orders").order_by(SyncLog.started_at.desc())
    )
    assert log is not None
    assert log.items_failed == 0


async def test_sync_marketplaces_creates_and_updates_channels(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    from backend.database.models.sales_channel import SalesChannel

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/Api/v3/canais-venda"
        return httpx.Response(
            200,
            json={
                "data": [
                    {
                        "id": 10,
                        "descricao": "Mercado Livre",
                        "tipo": "MERCADO_LIVRE",
                        "situacao": 1,
                    },
                    {"id": 11, "descricao": "Shopee", "tipo": "SHOPEE", "situacao": 1},
                ]
            },
        )

    transport = httpx.MockTransport(handler)
    http = httpx.AsyncClient(transport=transport, timeout=httpx.Timeout(1.0))
    client = BlingApiClient(settings, client=http)
    service = await _make_service(db_session, client, settings)

    result = await service.sync_marketplaces()
    await db_session.commit()

    assert result.status == "completed"
    assert result.items_created == 2
    channels = (await db_session.execute(select(SalesChannel))).scalars().all()
    assert len(channels) == 2
    ml = await db_session.scalar(select(SalesChannel).where(SalesChannel.bling_id == "10"))
    assert ml is not None
    assert ml.name == "Mercado Livre"
    assert ml.tipo == "MERCADO_LIVRE"
    assert ml.agrupador == 3
    assert ml.situacao == 1

    result = await service.sync_marketplaces()
    await db_session.commit()
    assert result.items_created == 0
    assert result.items_updated == 2


async def test_sync_marketplaces_skips_missing_fields(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    from backend.database.models.sales_channel import SalesChannel

    payload = {
        "data": [
            {"id": 12, "descricao": "Canal Ok", "tipo": "MARKETPLACE"},
            {"id": None, "descricao": "Sem ID"},
            {"id": 13, "descricao": ""},
        ]
    }
    service = await _make_service(db_session, _make_client(settings, payload), settings)
    result = await service.sync_marketplaces()
    await db_session.commit()

    assert result.items_created == 1
    assert result.items_skipped == 2
    assert (
        await db_session.scalar(select(SalesChannel).where(SalesChannel.bling_id == "13")) is None
    )


async def test_sync_product_channels_links_existing_products(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    from backend.database.models.product_channel import ProductChannel
    from backend.database.models.sales_channel import SalesChannel

    service = await _make_service(db_session, _make_client(settings, _products_payload()), settings)
    await service.sync_products()
    await db_session.commit()
    db_session.add(
        SalesChannel(bling_id="10", name="Mercado Livre", tipo="MERCADO_LIVRE", agrupador=3)
    )
    await db_session.flush()

    payload = {
        "data": [
            {
                "id": 500,
                "codigo": "MLB-SKU-1",
                "preco": 35.90,
                "precoPromocional": 29.90,
                "categoriasProdutos": [{"id": 777}],
                "produto": {"id": 1},
                "loja": {"id": 10},
            }
        ]
    }
    client = _make_client(settings, payload)
    service = await _make_service(db_session, client, settings)
    result = await service.sync_product_channels()
    await db_session.commit()

    assert result.status == "completed"
    assert result.items_created == 1
    link = await db_session.scalar(select(ProductChannel).where(ProductChannel.bling_id == "500"))
    assert link is not None
    assert link.codigo == "MLB-SKU-1"
    assert link.preco == Decimal("35.90")
    assert link.preco_promocional == Decimal("29.90")
    assert link.categoria_ids == ["777"]
    assert link.product.sku == "SKU-001"
    assert link.channel.name == "Mercado Livre"


async def test_sync_product_channels_skips_when_references_unknown(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    from backend.database.models.product_channel import ProductChannel

    payload = {
        "data": [
            {"id": 501, "produto": {"id": 999}, "loja": {"id": 10}},
            {"id": 502, "produto": {"id": 1}, "loja": {"id": 10}},
            {"id": 503, "produto": {"id": 1}, "loja": None},
        ]
    }
    service = await _make_service(db_session, _make_client(settings, payload), settings)
    result = await service.sync_product_channels()
    await db_session.commit()

    assert result.items_skipped == 3
    assert result.items_created == 0
    assert (
        await db_session.scalar(select(ProductChannel).where(ProductChannel.bling_id == "501"))
        is None
    )


async def test_sync_listings_requires_synced_channels(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    from backend.database.models.listing import Listing
    from backend.database.models.sales_channel import SalesChannel

    db_session.add(
        SalesChannel(bling_id="10", name="Mercado Livre", tipo="MERCADO_LIVRE", agrupador=3)
    )
    await db_session.flush()

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/Api/v3/anuncios":
            return httpx.Response(
                200,
                json={
                    "data": [
                        {
                            "id": 100,
                            "titulo": "Anuncio Um",
                            "situacao": 1,
                            "preco": 49.90,
                            "codigo": "EXT-1",
                        }
                    ]
                },
            )
        return httpx.Response(200, json={"data": {"id": 100, "produto": {"id": 1}}})

    transport = httpx.MockTransport(handler)
    http = httpx.AsyncClient(transport=transport, timeout=httpx.Timeout(1.0))
    client = BlingApiClient(settings, client=http)
    service = await _make_service(db_session, client, settings)

    result = await service.sync_listings()
    await db_session.commit()

    assert result.status == "completed"
    assert result.items_created == 1
    listing = await db_session.scalar(select(Listing).where(Listing.bling_id == "100"))
    assert listing is not None
    assert listing.title == "Anuncio Um"
    assert listing.channel_bling_id == "10"
    assert listing.channel_id is not None
    assert listing.product_bling_id == "1"


async def test_sync_listings_skips_when_no_channel_synced(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    from backend.database.models.listing import Listing

    payload = {"data": [{"id": 101, "titulo": "Sem Canal", "situacao": 1}]}
    service = await _make_service(db_session, _make_client(settings, payload), settings)
    result = await service.sync_listings()
    await db_session.commit()

    assert result.items_created == 0
    assert result.items_processed == 0
    assert await db_session.scalar(select(Listing).where(Listing.bling_id == "101")) is None
