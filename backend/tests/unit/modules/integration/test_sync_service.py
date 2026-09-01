from decimal import Decimal
from typing import Any

import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config.base import Settings
from backend.database.models.category import Category
from backend.database.models.product import Product
from backend.database.models.sync import SyncError, SyncLog
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


def _product(bling_id: str, sku: str, name: str | None = None) -> dict[str, Any]:
    return {"id": bling_id, "codigo": sku, "nome": name or f"Produto {bling_id}"}


async def _seed_sku_conflict(session: AsyncSession) -> None:
    category = Category(bling_id="seed-category", name="Seed Category")
    session.add(category)
    await session.flush()
    session.add_all(
        [
            Product(
                bling_id="seed-a",
                sku="SEED-A",
                name="Seed A",
                category_id=category.id,
            ),
            Product(
                bling_id="seed-b",
                sku="SEED-B",
                name="Seed B",
                category_id=category.id,
            ),
        ]
    )
    await session.commit()


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


@pytest.mark.parametrize("failure_index", [0, 1, 2], ids=["first", "middle", "last"])
async def test_sync_products_isolates_constraint_failure_per_item(
    db_session: AsyncSession,
    settings: Settings,
    failure_index: int,
) -> None:
    await _seed_sku_conflict(db_session)
    failing = _product("seed-a", "SEED-B", "Conflito de SKU")
    valid = [
        _product("valid-before", "VALID-BEFORE"),
        _product("valid-after", "VALID-AFTER"),
    ]
    items = list(valid)
    items.insert(failure_index, failing)
    service = await _make_service(db_session, _make_client(settings, {"data": items}), settings)

    result = await service.sync_products()
    await db_session.commit()

    assert result.status == "completed"
    assert result.items_processed == 2
    assert result.items_created == 2
    assert result.items_failed == 1
    assert await db_session.scalar(select(Product).where(Product.bling_id == "valid-before"))
    assert await db_session.scalar(select(Product).where(Product.bling_id == "valid-after"))
    seed_a = await db_session.scalar(select(Product).where(Product.bling_id == "seed-a"))
    assert seed_a is not None
    assert seed_a.sku == "SEED-A"
    log = await db_session.scalar(
        select(SyncLog).where(SyncLog.entity == "products").order_by(SyncLog.started_at.desc())
    )
    assert log is not None
    assert log.status == "completed"
    assert log.items_failed == 1
    error = await db_session.scalar(select(SyncError).where(SyncError.sync_log_id == log.id))
    assert error is not None
    assert error.external_id == "seed-a"
    assert error.error_type == "IntegrityError"
    assert error.error_message == "database constraint violation"


async def test_failed_flush_marks_session_inactive_and_skips_current_rollback_guard(
    db_session: AsyncSession,
) -> None:
    category = Category(bling_id="guard-category", name="Guard Category")
    db_session.add(category)
    await db_session.flush()
    db_session.add(
        Product(
            bling_id="guard-a",
            sku="GUARD-SKU",
            name="Guard A",
            category_id=category.id,
        )
    )
    await db_session.commit()
    db_session.add(
        Product(
            bling_id="guard-b",
            sku="GUARD-SKU",
            name="Guard B",
            category_id=category.id,
        )
    )

    with pytest.raises(IntegrityError):
        await db_session.flush()

    assert db_session.is_active is False
    rollback_called = False
    if db_session.is_active:
        rollback_called = True
        await db_session.rollback()
    assert rollback_called is False
    await db_session.rollback()
    assert db_session.is_active is True


async def test_sync_products_isolates_multiple_interleaved_failures(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    await _seed_sku_conflict(db_session)
    items = [
        _product("valid-1", "VALID-1"),
        _product("seed-a", "SEED-B", "Conflito 1"),
        _product("valid-2", "VALID-2"),
        _product("seed-a", "SEED-B", "Conflito 2"),
        _product("valid-3", "VALID-3"),
    ]
    service = await _make_service(db_session, _make_client(settings, {"data": items}), settings)

    result = await service.sync_products()
    await db_session.commit()

    assert result.items_created == 3
    assert result.items_failed == 2
    for bling_id in ("valid-1", "valid-2", "valid-3"):
        assert await db_session.scalar(select(Product).where(Product.bling_id == bling_id))
    log = await db_session.scalar(
        select(SyncLog).where(SyncLog.entity == "products").order_by(SyncLog.started_at.desc())
    )
    assert log is not None
    errors = (
        (await db_session.execute(select(SyncError).where(SyncError.sync_log_id == log.id)))
        .scalars()
        .all()
    )
    assert len(errors) == 2


async def test_sync_products_rejects_duplicate_sku_for_different_bling_id(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    await _seed_sku_conflict(db_session)
    incoming = _product("different-bling-id", "SEED-B", "Produto Conflitante")
    service = await _make_service(
        db_session, _make_client(settings, {"data": [incoming]}), settings
    )

    result = await service.sync_products()
    await db_session.commit()

    assert result.items_processed == 0
    assert result.items_updated == 0
    assert result.items_failed == 1
    existing = await db_session.scalar(select(Product).where(Product.sku == "SEED-B"))
    assert existing is not None
    assert existing.bling_id == "seed-b"
    assert existing.name == "Seed B"
    assert (
        await db_session.scalar(select(Product).where(Product.bling_id == "different-bling-id"))
        is None
    )
    error = await db_session.scalar(select(SyncError).where(SyncError.entity == "products"))
    assert error is not None
    assert error.error_type == "DuplicateSkuError"
    assert error.error_message == "SKU already belongs to a different Bling product"


async def test_sync_products_continues_when_error_recording_fails(
    db_session: AsyncSession,
    settings: Settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    items = [
        _product("valid-1", "VALID-1"),
        _product("broken", "BROKEN"),
        _product("valid-2", "VALID-2"),
    ]
    service = await _make_service(db_session, _make_client(settings, {"data": items}), settings)
    original_upsert = service._upsert_product

    async def failing_upsert(raw: dict[str, Any]) -> str:
        if raw["id"] == "broken":
            raise ValueError("invalid product value")
        return await original_upsert(raw)

    async def failing_record_error(*args: Any, **kwargs: Any) -> None:
        raise IntegrityError("insert sync error", {}, RuntimeError("observability unavailable"))

    monkeypatch.setattr(service, "_upsert_product", failing_upsert)
    monkeypatch.setattr(service, "_record_error", failing_record_error)

    result = await service.sync_products()
    await db_session.commit()

    assert result.status == "completed"
    assert result.items_created == 2
    assert result.items_failed == 1
    assert await db_session.scalar(select(Product).where(Product.bling_id == "valid-1"))
    assert await db_session.scalar(select(Product).where(Product.bling_id == "valid-2"))
    log = await db_session.scalar(
        select(SyncLog).where(SyncLog.entity == "products").order_by(SyncLog.started_at.desc())
    )
    assert log is not None
    assert log.items_failed == 1


async def test_sync_products_continues_when_skip_recording_fails(
    db_session: AsyncSession,
    settings: Settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    items = [
        _product("valid-1", "VALID-1"),
        {"id": "incomplete", "codigo": "", "nome": "Sem SKU"},
        _product("valid-2", "VALID-2"),
    ]
    service = await _make_service(db_session, _make_client(settings, {"data": items}), settings)

    async def failing_record_skip(*args: Any, **kwargs: Any) -> None:
        raise IntegrityError("insert sync skip", {}, RuntimeError("observability unavailable"))

    monkeypatch.setattr(service, "_record_skip", failing_record_skip)

    result = await service.sync_products()
    await db_session.commit()

    assert result.status == "completed"
    assert result.items_created == 2
    assert result.items_skipped == 1
    assert await db_session.scalar(select(Product).where(Product.bling_id == "valid-1"))
    assert await db_session.scalar(select(Product).where(Product.bling_id == "valid-2"))
    log = await db_session.scalar(
        select(SyncLog).where(SyncLog.entity == "products").order_by(SyncLog.started_at.desc())
    )
    assert log is not None
    assert log.items_created == 2


def test_safe_error_details_redacts_credentials() -> None:
    error_type, message = BlingSyncService._safe_error_details(
        ValueError(
            "Authorization: Bearer topsecret\n"
            "password=correct horse battery staple\n"
            "access_token=secret"
        )
    )

    assert error_type == "ValueError"
    assert "secret" not in message
    assert "correct" not in message
    assert "horse" not in message
    assert "topsecret" not in message
    assert message.count("[REDACTED]") == 3

    _, dictionary_message = BlingSyncService._safe_error_details(
        ValueError(
            "{'refresh_token': 'REFRESH-SECRET', "
            '"client_secret": "CLIENT-SECRET", "name": "Produto"}'
        )
    )
    assert "REFRESH-SECRET" not in dictionary_message
    assert "CLIENT-SECRET" not in dictionary_message
    assert dictionary_message.count("[REDACTED]") == 2
    assert "Produto" in dictionary_message


def test_safe_raw_data_redacts_nested_credentials() -> None:
    raw = {
        "id": "product-1",
        "access_token": "secret",
        "nested": {"client_secret": "other", "name": "Produto"},
        "items": [{"authorization": "Bearer token", "sku": "SKU-1"}],
    }

    sanitized = BlingSyncService._safe_raw_data(raw)

    assert sanitized == {
        "id": "product-1",
        "access_token": "[REDACTED]",
        "nested": {"client_secret": "[REDACTED]", "name": "Produto"},
        "items": [{"authorization": "[REDACTED]", "sku": "SKU-1"}],
    }


async def test_sync_products_continues_three_pages_after_middle_constraint_failure(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    await _seed_sku_conflict(db_session)
    pages: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        page = request.url.params["pagina"]
        pages.append(page)
        if page == "1":
            items = [_product(f"page-1-{i}", f"PAGE-1-{i}") for i in range(100)]
        elif page == "2":
            items = [_product(f"page-2-{i}", f"PAGE-2-{i}") for i in range(100)]
            items[50] = _product("seed-a", "SEED-B", "Conflito de SKU")
        else:
            items = [_product("page-3-1", "PAGE-3-1")]
        return httpx.Response(200, json={"data": items})

    transport = httpx.MockTransport(handler)
    http = httpx.AsyncClient(transport=transport, timeout=httpx.Timeout(1.0))
    service = await _make_service(db_session, BlingApiClient(settings, client=http), settings)

    result = await service.sync_products()
    await db_session.commit()

    assert pages == ["1", "2", "3"]
    assert result.items_created == 200
    assert result.items_failed == 1
    assert await db_session.scalar(select(Product).where(Product.bling_id == "page-1-0"))
    assert await db_session.scalar(select(Product).where(Product.bling_id == "page-3-1"))


async def test_sync_products_finalizes_failed_log_after_summary_flush_error(
    db_session: AsyncSession,
    settings: Settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    service = await _make_service(db_session, _make_client(settings, {"data": []}), settings)
    original_flush = db_session.flush
    flush_calls = 0

    async def fail_completed_status_flush(*args: Any, **kwargs: Any) -> None:
        nonlocal flush_calls
        flush_calls += 1
        if flush_calls == 2:
            assert service._active_log is not None
            service._active_log.status = "invalid"
        await original_flush(*args, **kwargs)

    monkeypatch.setattr(db_session, "flush", fail_completed_status_flush)

    result = await service.sync_products()
    await db_session.commit()

    assert result.status == "failed"
    assert result.error_message == "sync log finalization failed"
    log = await db_session.scalar(
        select(SyncLog).where(SyncLog.entity == "products").order_by(SyncLog.started_at.desc())
    )
    assert log is not None
    assert log.status == "failed"
    assert log.error_message == "sync log finalization failed"


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
    log = await db_session.scalar(
        select(SyncLog).where(SyncLog.entity == "products").order_by(SyncLog.started_at.desc())
    )
    assert log is not None
    assert log.status == "failed"
    assert log.finished_at is not None
    assert log.error_message == "list resource failed with status 500"


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


async def test_sync_orders_keeps_order_when_item_error_recording_fails(
    db_session: AsyncSession,
    settings: Settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from backend.database.models.order import Order

    payload = {
        "data": [
            {
                "id": 9003,
                "numero": "1003",
                "contato": {"nome": "Cliente C"},
                "total": {"valor": 20.0},
                "itens": [{"codigo": "UNKNOWN-SKU", "quantidade": 1, "valor": 20.0}],
            }
        ]
    }
    service = await _make_service(db_session, _make_client(settings, payload), settings)

    async def failing_record_item_error(*args: Any, **kwargs: Any) -> None:
        raise IntegrityError("insert item error", {}, RuntimeError("observability unavailable"))

    monkeypatch.setattr(service, "_record_item_error", failing_record_item_error)

    result = await service.sync_orders()
    await db_session.commit()

    assert result.items_created == 1
    assert result.items_failed == 0
    order = await db_session.scalar(select(Order).where(Order.external_id == "9003"))
    assert order is not None
    assert order.items == []


async def test_sync_orders_preserves_unknown_product_error_when_later_item_fails(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    await _seed_sku_conflict(db_session)
    payload = {
        "data": [
            {
                "id": 9004,
                "numero": "1004",
                "contato": {"nome": "Cliente D"},
                "total": {"valor": 20.0},
                "itens": [
                    {"codigo": "UNKNOWN-SKU", "quantidade": 1, "valor": 10.0},
                    {"codigo": "SEED-A", "quantidade": "invalid", "valor": 10.0},
                ],
            }
        ]
    }
    service = await _make_service(db_session, _make_client(settings, payload), settings)

    result = await service.sync_orders()
    await db_session.commit()

    assert result.items_failed == 1
    errors = (await db_session.execute(select(SyncError))).scalars().all()
    assert {error.error_type for error in errors} == {
        "ValueError",
        "order_item_unknown_product",
    }
    unknown = next(error for error in errors if error.error_type == "order_item_unknown_product")
    assert unknown.error_message == "order item product not found for sku=UNKNOWN-SKU"


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


async def test_sync_listings_isolates_per_channel_on_400(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    from backend.database.models.listing import Listing
    from backend.database.models.sales_channel import SalesChannel

    db_session.add_all(
        [
            SalesChannel(bling_id="10", name="ML", tipo="MERCADO_LIVRE", agrupador=3),
            SalesChannel(bling_id="20", name="Shopee", tipo="SHOPEE", agrupador=3),
            SalesChannel(bling_id="30", name="Amazon", tipo="Amazon", agrupador=3),
        ]
    )
    await db_session.flush()

    def handler(request: httpx.Request) -> httpx.Response:
        params = dict(request.url.params)
        id_loja = params.get("idLoja")
        if id_loja == "20":
            return httpx.Response(
                400,
                json={
                    "error": {
                        "type": "VALIDATION_ERROR",
                        "message": "tipoIntegracao invalido",
                        "description": "O tipo de integracao SHOPEE nao e suportado para anuncios",
                    }
                },
            )
        if request.url.path == "/Api/v3/anuncios":
            return httpx.Response(
                200,
                json={
                    "data": [
                        {
                            "id": 100 + int(id_loja or 0),
                            "titulo": f"Anuncio {id_loja}",
                            "situacao": 1,
                            "preco": 49.90,
                            "codigo": f"EXT-{id_loja}",
                        }
                    ]
                },
            )
        if request.url.path.startswith("/Api/v3/anuncios/"):
            return httpx.Response(
                200,
                json={"data": {"id": 200, "produto": {"id": 1}}},
            )
        return httpx.Response(200, json={"data": []})

    transport = httpx.MockTransport(handler)
    http = httpx.AsyncClient(transport=transport, timeout=httpx.Timeout(1.0))
    client = BlingApiClient(settings, client=http)
    service = await _make_service(db_session, client, settings)

    result = await service.sync_listings()
    await db_session.commit()

    assert result.status == "completed"
    assert result.items_created == 2
    assert result.items_failed == 0
    assert await db_session.scalar(select(Listing).where(Listing.bling_id == "110"))
    assert await db_session.scalar(select(Listing).where(Listing.bling_id == "130"))
    assert await db_session.scalar(select(Listing).where(Listing.bling_id == "120")) is None


async def test_list_resource_preserves_bling_error_body(
    settings: Settings,
) -> None:
    from backend.modules.integration.errors import ApiError

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            400,
            json={
                "error": {
                    "type": "VALIDATION_ERROR",
                    "message": "tipoIntegracao invalido",
                    "description": "O tipo de integracao XYZ nao e suportado",
                }
            },
        )

    transport = httpx.MockTransport(handler)
    http = httpx.AsyncClient(transport=transport, timeout=httpx.Timeout(1.0))
    client = BlingApiClient(settings, client=http)

    with pytest.raises(ApiError) as exc_info:
        await client.list_resource("/anuncios", _token_provider, {"limite": 100})

    message = str(exc_info.value)
    assert "400" in message
    assert "tipoIntegracao invalido" in message
    assert "XYZ" in message
    assert "Bearer" not in message
    assert "token" not in message.lower() or "token" in "tipoIntegracao"


async def test_sync_listings_updates_existing_listing(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    from backend.database.models.listing import Listing
    from backend.database.models.sales_channel import SalesChannel

    db_session.add(SalesChannel(bling_id="10", name="ML", tipo="MERCADO_LIVRE", agrupador=3))
    await db_session.flush()

    existing = Listing(bling_id="100", title="Old Title")
    db_session.add(existing)
    await db_session.flush()

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/Api/v3/anuncios":
            return httpx.Response(
                200,
                json={
                    "data": [
                        {
                            "id": 100,
                            "titulo": "Updated Title",
                            "situacao": 2,
                            "preco": 99.90,
                            "codigo": "EXT-100",
                        }
                    ]
                },
            )
        if request.url.path.startswith("/Api/v3/anuncios/"):
            return httpx.Response(200, json={"data": {"id": 200, "produto": {"id": 1}}})
        return httpx.Response(200, json={"data": []})

    transport = httpx.MockTransport(handler)
    http = httpx.AsyncClient(transport=transport, timeout=httpx.Timeout(1.0))
    client = BlingApiClient(settings, client=http)
    service = await _make_service(db_session, client, settings)

    result = await service.sync_listings()
    await db_session.commit()

    assert result.status == "completed"
    assert result.items_updated == 1
    assert result.items_created == 0
    listing = await db_session.scalar(select(Listing).where(Listing.bling_id == "100"))
    assert listing is not None
    assert listing.title == "Updated Title"
    assert listing.status == 2


async def test_sync_listings_skips_unknown_product(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    from backend.database.models.listing import Listing
    from backend.database.models.sales_channel import SalesChannel

    db_session.add(SalesChannel(bling_id="10", name="ML", tipo="MERCADO_LIVRE", agrupador=3))
    await db_session.flush()

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/Api/v3/anuncios":
            return httpx.Response(
                200,
                json={
                    "data": [
                        {
                            "id": 300,
                            "titulo": "Anuncio Sem Produto",
                            "situacao": 1,
                            "preco": 10.00,
                        }
                    ]
                },
            )
        if request.url.path.startswith("/Api/v3/anuncios/"):
            return httpx.Response(200, json={"data": {"id": 999, "produto": {"id": 999}}})
        return httpx.Response(200, json={"data": []})

    transport = httpx.MockTransport(handler)
    http = httpx.AsyncClient(transport=transport, timeout=httpx.Timeout(1.0))
    client = BlingApiClient(settings, client=http)
    service = await _make_service(db_session, client, settings)

    result = await service.sync_listings()
    await db_session.commit()

    assert result.status == "completed"
    assert result.items_created == 1
    listing = await db_session.scalar(select(Listing).where(Listing.bling_id == "300"))
    assert listing is not None
    assert listing.product_id is None
    assert listing.product_bling_id == "999"


async def test_sync_listings_empty_channels(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    service = await _make_service(db_session, _make_client(settings, {"data": []}), settings)
    result = await service.sync_listings()
    await db_session.commit()

    assert result.status == "completed"
    assert result.items_processed == 0
    assert result.items_created == 0


def _order_client(
    settings: Settings,
    orders_payload: dict[str, Any],
    situations: dict[str, dict[str, Any]] | None = None,
) -> BlingApiClient:
    """Client that serves order listing + per-id situation resolution."""

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/Api/v3/pedidos/vendas":
            return httpx.Response(200, json=orders_payload)
        if situations and request.url.path.startswith("/Api/v3/situacoes/"):
            sid = request.url.path.split("/")[-1]
            data = situations.get(sid)
            if data is not None:
                return httpx.Response(200, json={"data": data})
            return httpx.Response(404, json={"error": {"message": "not found"}})
        return httpx.Response(200, json={"data": []})

    transport = httpx.MockTransport(handler)
    http = httpx.AsyncClient(transport=transport, timeout=httpx.Timeout(1.0))
    return BlingApiClient(settings, client=http)


async def test_order_status_uses_valor_em_aberto(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    """situacao.valor=0 (Em aberto) -> pending."""
    from backend.database.models.order import Order

    payload = {
        "data": [
            {
                "id": 5001,
                "numero": "2001",
                "contato": {"nome": "Cli A"},
                "total": {"valor": 50.0},
                "situacao": {"id": 9, "valor": 0},
                "itens": [],
            }
        ],
    }
    client = _order_client(settings, payload)
    service = await _make_service(db_session, client, settings)
    result = await service.sync_orders()
    await db_session.commit()

    assert result.status == "completed"
    order = await db_session.scalar(select(Order).where(Order.external_id == "5001"))
    assert order is not None
    assert order.status == "pending"


async def test_order_status_uses_valor_atendido(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    """situacao.valor=1 (Atendido) -> completed."""
    from backend.database.models.order import Order

    payload = {
        "data": [
            {
                "id": 5002,
                "numero": "2002",
                "contato": {"nome": "Cli B"},
                "total": {"valor": 120.0},
                "situacao": {"id": 10, "valor": 1},
                "itens": [],
            }
        ],
    }
    client = _order_client(settings, payload)
    service = await _make_service(db_session, client, settings)
    result = await service.sync_orders()
    await db_session.commit()

    assert result.status == "completed"
    order = await db_session.scalar(select(Order).where(Order.external_id == "5002"))
    assert order is not None
    assert order.status == "completed"


async def test_order_status_uses_valor_cancelado(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    """situacao.valor=2 (Cancelado) -> cancelled."""
    from backend.database.models.order import Order

    payload = {
        "data": [
            {
                "id": 5003,
                "numero": "2003",
                "contato": {"nome": "Cli C"},
                "total": {"valor": 80.0},
                "situacao": {"id": 11, "valor": 2},
                "itens": [],
            }
        ],
    }
    client = _order_client(settings, payload)
    service = await _make_service(db_session, client, settings)
    result = await service.sync_orders()
    await db_session.commit()

    assert result.status == "completed"
    order = await db_session.scalar(select(Order).where(Order.external_id == "5003"))
    assert order is not None
    assert order.status == "cancelled"


async def test_order_status_mix_of_situations(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    """Multiple orders with different Bling situations map correctly."""
    from backend.database.models.order import Order

    payload = {
        "data": [
            {
                "id": 5010,
                "numero": "2010",
                "contato": {"nome": "Cli X"},
                "total": {"valor": 100.0},
                "situacao": {"id": 9, "valor": 0},
                "itens": [],
            },
            {
                "id": 5011,
                "numero": "2011",
                "contato": {"nome": "Cli Y"},
                "total": {"valor": 200.0},
                "situacao": {"id": 10, "valor": 1},
                "itens": [],
            },
            {
                "id": 5012,
                "numero": "2012",
                "contato": {"nome": "Cli Z"},
                "total": {"valor": 150.0},
                "situacao": {"id": 11, "valor": 2},
                "itens": [],
            },
            {
                "id": 5013,
                "numero": "2013",
                "contato": {"nome": "Cli W"},
                "total": {"valor": 75.0},
                "situacao": {"id": 12, "valor": 3},
                "itens": [],
            },
        ],
    }
    client = _order_client(settings, payload)
    service = await _make_service(db_session, client, settings)
    result = await service.sync_orders()
    await db_session.commit()

    assert result.status == "completed"
    assert result.items_created == 4

    statuses = {}
    for ext_id in ["5010", "5011", "5012", "5013"]:
        o = await db_session.scalar(select(Order).where(Order.external_id == ext_id))
        assert o is not None
        statuses[ext_id] = o.status

    assert statuses["5010"] == "pending"
    assert statuses["5011"] == "completed"
    assert statuses["5012"] == "cancelled"
    assert statuses["5013"] == "pending"


async def test_order_status_fallback_to_situacoes_api(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    """When valor is missing, fallback to GET /situacoes/{id} nome."""
    from backend.database.models.order import Order

    payload = {
        "data": [
            {
                "id": 5020,
                "numero": "2020",
                "contato": {"nome": "Cli Fallback"},
                "total": {"valor": 60.0},
                "situacao": {"id": 99},
                "itens": [],
            }
        ],
    }
    situations = {"99": {"id": 99, "nome": "Atendido"}}
    client = _order_client(settings, payload, situations=situations)
    service = await _make_service(db_session, client, settings)
    result = await service.sync_orders()
    await db_session.commit()

    assert result.status == "completed"
    order = await db_session.scalar(select(Order).where(Order.external_id == "5020"))
    assert order is not None
    assert order.status == "completed"


async def test_order_status_unknown_situation_falls_back_to_pending(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    """Unknown situation valor -> pending, no crash."""
    from backend.database.models.order import Order

    payload = {
        "data": [
            {
                "id": 5030,
                "numero": "2030",
                "contato": {"nome": "Cli Unknown"},
                "total": {"valor": 40.0},
                "situacao": {"id": 999, "valor": 99},
                "itens": [],
            }
        ],
    }
    client = _order_client(settings, payload)
    service = await _make_service(db_session, client, settings)
    result = await service.sync_orders()
    await db_session.commit()

    assert result.status == "completed"
    order = await db_session.scalar(select(Order).where(Order.external_id == "5030"))
    assert order is not None
    assert order.status == "pending"


async def test_order_resync_updates_existing_order_status(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    """Re-syncing an order updates its status (idempotent)."""
    from backend.database.models.order import Order

    payload_v1 = {
        "data": [
            {
                "id": 5040,
                "numero": "2040",
                "contato": {"nome": "Cli Resync"},
                "total": {"valor": 90.0},
                "situacao": {"id": 9, "valor": 0},
                "itens": [],
            }
        ],
    }
    client = _order_client(settings, payload_v1)
    service = await _make_service(db_session, client, settings)
    result1 = await service.sync_orders()
    await db_session.commit()
    assert result1.items_created == 1

    payload_v2 = {
        "data": [
            {
                "id": 5040,
                "numero": "2040",
                "contato": {"nome": "Cli Resync"},
                "total": {"valor": 90.0},
                "situacao": {"id": 10, "valor": 1},
                "itens": [],
            }
        ],
    }
    client2 = _order_client(settings, payload_v2)
    service2 = await _make_service(db_session, client2, settings)
    result2 = await service2.sync_orders()
    await db_session.commit()

    assert result2.items_updated == 1
    order = await db_session.scalar(select(Order).where(Order.external_id == "5040"))
    assert order is not None
    assert order.status == "completed"


async def test_order_sync_resolves_channel_from_loja(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    """Order with loja.id matching a sales_channel gets channel_id set."""
    from backend.database.models.order import Order
    from backend.database.models.sales_channel import SalesChannel

    channel = SalesChannel(bling_id="42", name="Amazon", tipo="AMAZON", agrupador=3, situacao=1)
    db_session.add(channel)
    await db_session.flush()

    payload = {
        "data": [
            {
                "id": 6001,
                "numero": "3001",
                "contato": {"nome": "Cliente Loja"},
                "total": {"valor": 200.0},
                "loja": {"id": 42, "descricao": "Amazon"},
                "itens": [],
            }
        ],
    }
    client = _order_client(settings, payload)
    service = await _make_service(db_session, client, settings)
    result = await service.sync_orders()
    await db_session.commit()

    assert result.items_created == 1
    order = await db_session.scalar(select(Order).where(Order.external_id == "6001"))
    assert order is not None
    assert order.channel_id == channel.id


async def test_order_sync_missing_loja_sets_channel_null(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    """Order without loja field gets channel_id = null (no failure)."""
    from backend.database.models.order import Order

    payload = {
        "data": [
            {
                "id": 6002,
                "numero": "3002",
                "contato": {"nome": "Cliente Sem Loja"},
                "total": {"valor": 50.0},
                "itens": [],
            }
        ],
    }
    client = _order_client(settings, payload)
    service = await _make_service(db_session, client, settings)
    result = await service.sync_orders()
    await db_session.commit()

    assert result.items_created == 1
    order = await db_session.scalar(select(Order).where(Order.external_id == "6002"))
    assert order is not None
    assert order.channel_id is None


async def test_order_sync_unknown_loja_sets_channel_null(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    """Order with loja.id not matching any sales_channel gets channel_id = null."""
    from backend.database.models.order import Order

    payload = {
        "data": [
            {
                "id": 6003,
                "numero": "3003",
                "contato": {"nome": "Cliente Loja Desconhecida"},
                "total": {"valor": 75.0},
                "loja": {"id": 999, "descricao": "Canal Inexistente"},
                "itens": [],
            }
        ],
    }
    client = _order_client(settings, payload)
    service = await _make_service(db_session, client, settings)
    result = await service.sync_orders()
    await db_session.commit()

    assert result.items_created == 1
    order = await db_session.scalar(select(Order).where(Order.external_id == "6003"))
    assert order is not None
    assert order.channel_id is None


# --- ordered_at from Bling date ---


async def test_order_ordered_at_uses_bling_date(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    """A: New order with valid Bling date → ordered_at == Bling date."""
    from datetime import datetime, timezone, timedelta
    from backend.database.models.order import Order

    service = await _make_service(db_session, _make_client(settings, _products_payload()), settings)
    await service.sync_products()
    await db_session.commit()

    payload = {
        "data": [
            {
                "id": 7001,
                "numero": "4001",
                "data": "2026-03-15T14:30:00-03:00",
                "contato": {"nome": "Cliente Data"},
                "total": {"valor": 200.0},
                "itens": [{"codigo": "SKU-001", "quantidade": 1, "valor": 200.0}],
            }
        ],
    }
    client = _order_client(settings, payload)
    service = await _make_service(db_session, client, settings)
    result = await service.sync_orders()
    await db_session.commit()

    assert result.items_created == 1
    order = await db_session.scalar(select(Order).where(Order.external_id == "7001"))
    assert order is not None
    expected = datetime(2026, 3, 15, 17, 30, 0, tzinfo=timezone.utc)
    assert order.ordered_at == expected


async def test_order_ordered_at_fallback_when_no_date(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    """B: New order without date → ordered_at uses fallback (self._now())."""
    from backend.database.models.order import Order

    service = await _make_service(db_session, _make_client(settings, _products_payload()), settings)
    await service.sync_products()
    await db_session.commit()

    payload = {
        "data": [
            {
                "id": 7002,
                "numero": "4002",
                "contato": {"nome": "Cliente Sem Data"},
                "total": {"valor": 50.0},
                "itens": [{"codigo": "SKU-001", "quantidade": 1, "valor": 50.0}],
            }
        ],
    }
    client = _order_client(settings, payload)
    service = await _make_service(db_session, client, settings)
    before = service._now()
    result = await service.sync_orders()
    after = service._now()
    await db_session.commit()

    assert result.items_created == 1
    order = await db_session.scalar(select(Order).where(Order.external_id == "7002"))
    assert order is not None
    assert before <= order.ordered_at <= after


async def test_order_ordered_at_corrected_on_resync(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    """C: Existing order with wrong ordered_at + valid Bling date → corrected."""
    from datetime import datetime, timezone
    from backend.database.models.order import Order

    service = await _make_service(db_session, _make_client(settings, _products_payload()), settings)
    await service.sync_products()
    await db_session.commit()

    # First sync: no date → ordered_at = now
    payload_v1 = {
        "data": [
            {
                "id": 7003,
                "numero": "4003",
                "contato": {"nome": "Cliente Resync"},
                "total": {"valor": 100.0},
                "itens": [{"codigo": "SKU-001", "quantidade": 1, "valor": 100.0}],
            }
        ],
    }
    client = _order_client(settings, payload_v1)
    service = await _make_service(db_session, client, settings)
    await service.sync_orders()
    await db_session.commit()

    order_before = await db_session.scalar(select(Order).where(Order.external_id == "7003"))
    ordered_at_v1 = order_before.ordered_at

    # Second sync: with real Bling date
    payload_v2 = {
        "data": [
            {
                "id": 7003,
                "numero": "4003",
                "data": "2025-12-01T09:00:00-03:00",
                "contato": {"nome": "Cliente Resync"},
                "total": {"valor": 100.0},
                "itens": [{"codigo": "SKU-001", "quantidade": 1, "valor": 100.0}],
            }
        ],
    }
    client2 = _order_client(settings, payload_v2)
    service2 = await _make_service(db_session, client2, settings)
    await service2.sync_orders()
    await db_session.commit()

    order_after = await db_session.scalar(select(Order).where(Order.external_id == "7003"))
    expected = datetime(2025, 12, 1, 12, 0, 0, tzinfo=timezone.utc)
    assert order_after.ordered_at == expected
    assert order_after.ordered_at != ordered_at_v1


async def test_order_ordered_at_preserved_when_no_date_on_resync(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    """D: Existing order without date in payload → ordered_at preserved."""
    from backend.database.models.order import Order

    service = await _make_service(db_session, _make_client(settings, _products_payload()), settings)
    await service.sync_products()
    await db_session.commit()

    # First sync: with date
    payload_v1 = {
        "data": [
            {
                "id": 7004,
                "numero": "4004",
                "data": "2026-06-10T12:00:00-03:00",
                "contato": {"nome": "Cliente Preserve"},
                "total": {"valor": 75.0},
                "itens": [{"codigo": "SKU-001", "quantidade": 1, "valor": 75.0}],
            }
        ],
    }
    client = _order_client(settings, payload_v1)
    service = await _make_service(db_session, client, settings)
    await service.sync_orders()
    await db_session.commit()

    order_v1 = await db_session.scalar(select(Order).where(Order.external_id == "7004"))
    ordered_at_v1 = order_v1.ordered_at

    # Second sync: without date
    payload_v2 = {
        "data": [
            {
                "id": 7004,
                "numero": "4004",
                "contato": {"nome": "Cliente Preserve"},
                "total": {"valor": 75.0},
                "itens": [{"codigo": "SKU-001", "quantidade": 1, "valor": 75.0}],
            }
        ],
    }
    client2 = _order_client(settings, payload_v2)
    service2 = await _make_service(db_session, client2, settings)
    await service2.sync_orders()
    await db_session.commit()

    order_v2 = await db_session.scalar(select(Order).where(Order.external_id == "7004"))
    assert order_v2.ordered_at == ordered_at_v1


async def test_order_ordered_at_timezone_aware(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    """E: Date with -03:00 timezone → parsed as timezone-aware datetime."""
    from datetime import datetime, timezone
    from backend.database.models.order import Order

    service = await _make_service(db_session, _make_client(settings, _products_payload()), settings)
    await service.sync_products()
    await db_session.commit()

    payload = {
        "data": [
            {
                "id": 7005,
                "numero": "4005",
                "data": "2026-07-20T18:45:00-03:00",
                "contato": {"nome": "Cliente TZ"},
                "total": {"valor": 300.0},
                "itens": [{"codigo": "SKU-001", "quantidade": 1, "valor": 300.0}],
            }
        ],
    }
    client = _order_client(settings, payload)
    service = await _make_service(db_session, client, settings)
    result = await service.sync_orders()
    await db_session.commit()

    assert result.items_created == 1
    order = await db_session.scalar(select(Order).where(Order.external_id == "7005"))
    assert order is not None
    assert order.ordered_at.tzinfo is not None
    expected = datetime(2026, 7, 20, 21, 45, 0, tzinfo=timezone.utc)
    assert order.ordered_at == expected


async def test_order_ordered_at_and_channel_id_coexist(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    """F: ordered_at from Bling date and channel_id from loja both resolve."""
    from datetime import datetime, timezone
    from backend.database.models.order import Order
    from backend.database.models.sales_channel import SalesChannel

    service = await _make_service(db_session, _make_client(settings, _products_payload()), settings)
    await service.sync_products()
    await db_session.commit()

    channel = SalesChannel(bling_id="55", name="Shopee", tipo="SHOPEE", agrupador=3, situacao=1)
    db_session.add(channel)
    await db_session.flush()

    payload = {
        "data": [
            {
                "id": 7006,
                "numero": "4006",
                "data": "2026-08-01T08:00:00-03:00",
                "contato": {"nome": "Cliente Completo"},
                "total": {"valor": 500.0},
                "loja": {"id": 55, "descricao": "Shopee"},
                "itens": [{"codigo": "SKU-001", "quantidade": 1, "valor": 500.0}],
            }
        ],
    }
    client = _order_client(settings, payload)
    service = await _make_service(db_session, client, settings)
    result = await service.sync_orders()
    await db_session.commit()

    assert result.items_created == 1
    order = await db_session.scalar(select(Order).where(Order.external_id == "7006"))
    assert order is not None
    expected_date = datetime(2026, 8, 1, 11, 0, 0, tzinfo=timezone.utc)
    assert order.ordered_at == expected_date
    assert order.channel_id == channel.id


# --- backfill_orders ---


def _backfill_client(
    settings: Settings,
    order_responses: dict[str, dict[str, Any] | None],
) -> BlingApiClient:
    """Client that serves GET /pedidos/vendas/{id} for backfill tests.

    order_responses maps external_id -> Bling response data dict or None (404).
    """

    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        prefix = "/Api/v3/pedidos/vendas/"
        if path.startswith(prefix):
            eid = path[len(prefix):]
            if eid in order_responses:
                data = order_responses[eid]
                if data is None:
                    return httpx.Response(404, json={"error": {"message": "not found"}})
                return httpx.Response(200, json={"data": data})
        return httpx.Response(404, json={"error": {"message": "not found"}})

    transport = httpx.MockTransport(handler)
    http = httpx.AsyncClient(transport=transport, timeout=httpx.Timeout(1.0))
    return BlingApiClient(settings, client=http)


async def test_backfill_existing_null_loja_match(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    """A: existing + NULL + loja with match -> updated, channel_id filled."""
    from uuid import uuid4
    from datetime import datetime, timezone
    from backend.database.models.order import Order
    from backend.database.models.sales_channel import SalesChannel

    service = await _make_service(db_session, _make_client(settings, _products_payload()), settings)
    await service.sync_products()
    await db_session.commit()

    channel = SalesChannel(bling_id="10", name="Shopee", tipo="SHOPEE", agrupador=3, situacao=1)
    db_session.add(channel)
    await db_session.flush()

    order = Order(
        id=uuid4(),
        external_id="9001",
        marketplace="bling",
        order_number="5001",
        customer_name="Old",
        ordered_at=datetime(2026, 8, 31, 17, 20, 0, tzinfo=timezone.utc),
    )
    db_session.add(order)
    await db_session.flush()

    order_responses = {
        "9001": {
            "id": 9001,
            "numero": "5001",
            "data": "2026-08-15T10:00:00-03:00",
            "contato": {"nome": "Old"},
            "total": {"valor": 150.0},
            "loja": {"id": 10, "descricao": "Shopee"},
            "itens": [{"codigo": "SKU-001", "quantidade": 1, "valor": 150.0}],
        },
    }
    client = _backfill_client(settings, order_responses)
    service = await _make_service(db_session, client, settings)
    result = await service.backfill_orders(["9001"])
    await db_session.commit()

    assert result.selected == 1
    assert result.eligible == 1
    assert result.processed == 1
    assert result.updated == 1
    assert result.with_channel == 1
    assert result.missing_local == 0
    assert result.already_linked == 0
    assert result.bling_not_found == 0
    assert result.failed == 0

    order = await db_session.scalar(select(Order).where(Order.external_id == "9001"))
    assert order is not None
    assert order.channel_id == channel.id
    expected_date = datetime(2026, 8, 15, 13, 0, 0, tzinfo=timezone.utc)
    assert order.ordered_at == expected_date


async def test_backfill_corrects_ordered_at(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    """B: existing + NULL + real Bling date -> ordered_at corrected."""
    from uuid import uuid4
    from datetime import datetime, timezone
    from backend.database.models.order import Order

    service = await _make_service(db_session, _make_client(settings, _products_payload()), settings)
    await service.sync_products()
    await db_session.commit()

    order = Order(
        id=uuid4(),
        external_id="9002",
        marketplace="bling",
        order_number="5002",
        customer_name="Old2",
        ordered_at=datetime(2026, 8, 31, 17, 20, 0, tzinfo=timezone.utc),
    )
    db_session.add(order)
    await db_session.flush()

    order_responses = {
        "9002": {
            "id": 9002,
            "numero": "5002",
            "data": "2026-07-01T08:30:00-03:00",
            "contato": {"nome": "Old2"},
            "total": {"valor": 80.0},
            "itens": [],
        },
    }
    client = _backfill_client(settings, order_responses)
    service = await _make_service(db_session, client, settings)
    result = await service.backfill_orders(["9002"])
    await db_session.commit()

    assert result.eligible == 1
    assert result.processed == 1
    assert result.without_store == 1
    order = await db_session.scalar(select(Order).where(Order.external_id == "9002"))
    expected_date = datetime(2026, 7, 1, 11, 30, 0, tzinfo=timezone.utc)
    assert order.ordered_at == expected_date
    assert order.channel_id is None


async def test_backfill_loja_absent_channel_stays_null(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    """C: existing + NULL + loja absent -> channel_id stays NULL."""
    from uuid import uuid4
    from datetime import datetime, timezone
    from backend.database.models.order import Order

    service = await _make_service(db_session, _make_client(settings, _products_payload()), settings)
    await service.sync_products()
    await db_session.commit()

    order = Order(
        id=uuid4(),
        external_id="9003",
        marketplace="bling",
        order_number="5003",
        customer_name="NoLoja",
        ordered_at=datetime(2026, 8, 31, 17, 20, 0, tzinfo=timezone.utc),
    )
    db_session.add(order)
    await db_session.flush()

    order_responses = {
        "9003": {
            "id": 9003,
            "numero": "5003",
            "data": "2026-08-20T09:00:00-03:00",
            "contato": {"nome": "NoLoja"},
            "total": {"valor": 60.0},
            "itens": [],
        },
    }
    client = _backfill_client(settings, order_responses)
    service = await _make_service(db_session, client, settings)
    result = await service.backfill_orders(["9003"])
    await db_session.commit()

    assert result.without_store == 1
    assert result.with_channel == 0
    order = await db_session.scalar(select(Order).where(Order.external_id == "9003"))
    assert order.channel_id is None


async def test_backfill_loja_unmatched(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    """D: existing + NULL + loja.id without SalesChannel -> unmatched."""
    from uuid import uuid4
    from datetime import datetime, timezone
    from backend.database.models.order import Order

    service = await _make_service(db_session, _make_client(settings, _products_payload()), settings)
    await service.sync_products()
    await db_session.commit()

    order = Order(
        id=uuid4(),
        external_id="9004",
        marketplace="bling",
        order_number="5004",
        customer_name="Unmatched",
        ordered_at=datetime(2026, 8, 31, 17, 20, 0, tzinfo=timezone.utc),
    )
    db_session.add(order)
    await db_session.flush()

    order_responses = {
        "9004": {
            "id": 9004,
            "numero": "5004",
            "data": "2026-08-10T14:00:00-03:00",
            "contato": {"nome": "Unmatched"},
            "total": {"valor": 90.0},
            "loja": {"id": 999, "descricao": "Canal Fantasma"},
            "itens": [],
        },
    }
    client = _backfill_client(settings, order_responses)
    service = await _make_service(db_session, client, settings)
    result = await service.backfill_orders(["9004"])
    await db_session.commit()

    assert result.unmatched_channel == 1
    assert result.with_channel == 0
    order = await db_session.scalar(select(Order).where(Order.external_id == "9004"))
    assert order.channel_id is None


async def test_backfill_missing_local_not_created(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    """E: external_id not in local DB -> missing_local, NOT created."""
    from uuid import uuid4
    from datetime import datetime, timezone
    from backend.database.models.order import Order

    service = await _make_service(db_session, _make_client(settings, _products_payload()), settings)
    await service.sync_products()
    await db_session.commit()

    order_responses = {
        "9999": {
            "id": 9999,
            "numero": "9999",
            "data": "2026-08-01T10:00:00-03:00",
            "contato": {"nome": "Phantom"},
            "total": {"valor": 50.0},
            "itens": [],
        },
    }
    client = _backfill_client(settings, order_responses)
    service = await _make_service(db_session, client, settings)
    result = await service.backfill_orders(["9999"])
    await db_session.commit()

    assert result.missing_local == 1
    assert result.processed == 0
    order = await db_session.scalar(select(Order).where(Order.external_id == "9999"))
    assert order is None


async def test_backfill_already_linked_preserved(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    """F: existing + channel_id already set -> already_linked, nothing changed."""
    from uuid import uuid4
    from datetime import datetime, timezone
    from backend.database.models.order import Order
    from backend.database.models.sales_channel import SalesChannel

    service = await _make_service(db_session, _make_client(settings, _products_payload()), settings)
    await service.sync_products()
    await db_session.commit()

    channel = SalesChannel(bling_id="10", name="Shopee", tipo="SHOPEE", agrupador=3, situacao=1)
    db_session.add(channel)
    await db_session.flush()

    original_date = datetime(2026, 8, 31, 17, 20, 0, tzinfo=timezone.utc)
    order = Order(
        id=uuid4(),
        external_id="9005",
        marketplace="bling",
        order_number="5005",
        customer_name="Linked",
        ordered_at=original_date,
        channel_id=channel.id,
    )
    db_session.add(order)
    await db_session.flush()

    order_responses = {
        "9005": {
            "id": 9005,
            "numero": "5005",
            "data": "2026-07-15T10:00:00-03:00",
            "contato": {"nome": "Linked"},
            "total": {"valor": 200.0},
            "loja": {"id": 99, "descricao": "Outro Canal"},
            "itens": [],
        },
    }
    client = _backfill_client(settings, order_responses)
    service = await _make_service(db_session, client, settings)
    result = await service.backfill_orders(["9005"])
    await db_session.commit()

    assert result.already_linked == 1
    assert result.processed == 0
    assert result.eligible == 0

    order = await db_session.scalar(select(Order).where(Order.external_id == "9005"))
    assert order.channel_id == channel.id
    assert order.ordered_at == original_date


async def test_backfill_bling_not_found_continues(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    """G: Bling 404 -> bling_not_found, continues batch."""
    from uuid import uuid4
    from datetime import datetime, timezone
    from backend.database.models.order import Order

    service = await _make_service(db_session, _make_client(settings, _products_payload()), settings)
    await service.sync_products()
    await db_session.commit()

    order = Order(
        id=uuid4(),
        external_id="9006",
        marketplace="bling",
        order_number="5006",
        customer_name="Ghost",
        ordered_at=datetime(2026, 8, 31, 17, 20, 0, tzinfo=timezone.utc),
    )
    db_session.add(order)
    await db_session.flush()

    order_responses = {"9006": None}
    client = _backfill_client(settings, order_responses)
    service = await _make_service(db_session, client, settings)
    result = await service.backfill_orders(["9006"])
    await db_session.commit()

    assert result.bling_not_found == 1
    assert result.processed == 0


async def test_backfill_error_isolated(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    """H: error in 1 order -> failed, others continue."""
    from uuid import uuid4
    from datetime import datetime, timezone
    from backend.database.models.order import Order
    from backend.database.models.sales_channel import SalesChannel

    service = await _make_service(db_session, _make_client(settings, _products_payload()), settings)
    await service.sync_products()
    await db_session.commit()

    for eid in ["9007", "9008"]:
        order = Order(
            id=uuid4(),
            external_id=eid,
            marketplace="bling",
            order_number=f"500{eid[-1:]}",
            customer_name=f"Client{eid}",
            ordered_at=datetime(2026, 8, 31, 17, 20, 0, tzinfo=timezone.utc),
        )
        db_session.add(order)
    await db_session.flush()

    channel = SalesChannel(bling_id="10", name="Shopee", tipo="SHOPEE", agrupador=3, situacao=1)
    db_session.add(channel)
    await db_session.flush()

    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        prefix = "/Api/v3/pedidos/vendas/"
        if path.startswith(prefix):
            eid = path[len(prefix):]
            if eid == "9007":
                return httpx.Response(500, json={"error": {"message": "server error"}})
            if eid == "9008":
                return httpx.Response(200, json={
                    "data": {
                        "id": 9008,
                        "numero": "5008",
                        "data": "2026-08-05T10:00:00-03:00",
                        "contato": {"nome": "Client9008"},
                        "total": {"valor": 200.0},
                        "loja": {"id": 10, "descricao": "Shopee"},
                        "itens": [],
                    }
                })
        return httpx.Response(404, json={"error": {"message": "not found"}})

    transport = httpx.MockTransport(handler)
    http = httpx.AsyncClient(transport=transport, timeout=httpx.Timeout(1.0))
    client = BlingApiClient(settings, client=http)
    service = await _make_service(db_session, client, settings)
    result = await service.backfill_orders(["9007", "9008"])
    await db_session.commit()

    assert result.failed == 1
    assert result.processed == 1
    assert result.with_channel == 1


async def test_backfill_idempotent_on_repeat(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    """I: repeated execution -> second run skips already_linked."""
    from uuid import uuid4
    from datetime import datetime, timezone
    from backend.database.models.order import Order

    service = await _make_service(db_session, _make_client(settings, _products_payload()), settings)
    await service.sync_products()
    await db_session.commit()

    order = Order(
        id=uuid4(),
        external_id="9009",
        marketplace="bling",
        order_number="5009",
        customer_name="Idempotent",
        ordered_at=datetime(2026, 8, 31, 17, 20, 0, tzinfo=timezone.utc),
    )
    db_session.add(order)
    await db_session.flush()

    order_responses = {
        "9009": {
            "id": 9009,
            "numero": "5009",
            "data": "2026-08-12T12:00:00-03:00",
            "contato": {"nome": "Idempotent"},
            "total": {"valor": 100.0},
            "itens": [],
        },
    }
    client = _backfill_client(settings, order_responses)
    service = await _make_service(db_session, client, settings)

    r1 = await service.backfill_orders(["9009"])
    assert r1.processed == 1
    assert r1.updated == 1
    assert r1.eligible == 1

    r2 = await service.backfill_orders(["9009"])
    assert r2.already_linked == 1
    assert r2.processed == 0
    assert r2.eligible == 0

    order = await db_session.scalar(select(Order).where(Order.external_id == "9009"))
    expected_date = datetime(2026, 8, 12, 15, 0, 0, tzinfo=timezone.utc)
    assert order.ordered_at == expected_date


async def test_sync_orders_still_creates_new(
    db_session: AsyncSession,
    settings: Settings,
) -> None:
    """J: sync_orders() still creates new orders (default behavior unchanged)."""
    from backend.database.models.order import Order

    service = await _make_service(db_session, _make_client(settings, _products_payload()), settings)
    await service.sync_products()
    await db_session.commit()

    payload = {
        "data": [
            {
                "id": 9010,
                "numero": "5010",
                "data": "2026-08-01T10:00:00-03:00",
                "contato": {"nome": "NewViaSync"},
                "total": {"valor": 120.0},
                "itens": [{"codigo": "SKU-001", "quantidade": 1, "valor": 120.0}],
            }
        ],
    }
    client = _order_client(settings, payload)
    service = await _make_service(db_session, client, settings)
    result = await service.sync_orders()
    await db_session.commit()

    assert result.items_created == 1
    order = await db_session.scalar(select(Order).where(Order.external_id == "9010"))
    assert order is not None


async def test_backfill_persistence_across_sessions(
    pg_engine,
    session_factory,
    settings: Settings,
) -> None:
    """Persistence: backfill writes visible in a NEW session after commit."""
    from uuid import uuid4
    from datetime import datetime, timezone
    from sqlalchemy.ext.asyncio import AsyncSession
    from backend.database.models.order import Order
    from backend.database.models.sales_channel import SalesChannel
    from backend.database.base import Base
    from sqlalchemy import text

    async with pg_engine.begin() as conn:
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS operational"))
        await conn.run_sync(Base.metadata.create_all)

    async with session_factory() as setup_session:
        channel = SalesChannel(bling_id="10", name="Shopee", tipo="SHOPEE", agrupador=3, situacao=1)
        setup_session.add(channel)
        await setup_session.flush()

        order = Order(
            id=uuid4(),
            external_id="9011",
            marketplace="bling",
            order_number="5011",
            customer_name="Persist",
            ordered_at=datetime(2026, 8, 31, 17, 20, 0, tzinfo=timezone.utc),
        )
        setup_session.add(order)
        await setup_session.commit()

    async with session_factory() as exec_session:
        service = await _make_service(
            exec_session,
            _backfill_client(settings, {
                "9011": {
                    "id": 9011,
                    "numero": "5011",
                    "data": "2026-06-01T08:00:00-03:00",
                    "contato": {"nome": "Persist"},
                    "total": {"valor": 300.0},
                    "loja": {"id": 10, "descricao": "Shopee"},
                    "itens": [],
                }
            }),
            settings,
        )
        result = await service.backfill_orders(["9011"])
        await exec_session.commit()

    async with session_factory() as verify_session:
        order = await verify_session.scalar(
            select(Order).where(Order.external_id == "9011")
        )
        assert order is not None
        expected_date = datetime(2026, 6, 1, 11, 0, 0, tzinfo=timezone.utc)
        assert order.ordered_at == expected_date
        assert order.channel_id is not None
