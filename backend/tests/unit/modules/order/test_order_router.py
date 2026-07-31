from collections.abc import AsyncGenerator
from decimal import Decimal
from typing import Any
from uuid import uuid4

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from backend.core.di import get_db_session
from backend.database.models.category import Category
from backend.database.models.order import Order, OrderItem
from backend.database.models.product import Product


@pytest_asyncio.fixture
async def api_client(
    session_factory: async_sessionmaker[AsyncSession],
) -> AsyncGenerator[AsyncClient, None]:
    from backend.main import create_app

    async def override_get_db_session() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app = create_app()
    app.dependency_overrides[get_db_session] = override_get_db_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


async def _create_order(
    client: AsyncClient,
    external_id: str = "EXT-001",
    status: str = "pending",
) -> dict[str, Any]:
    response = await client.post(
        "/orders",
        json={
            "external_id": external_id,
            "marketplace": "bling",
            "order_number": "12345",
            "customer_name": "Cliente Teste",
            "status": status,
            "total_amount": "100.00",
            "ordered_at": "2026-07-31T10:00:00Z",
        },
    )
    assert response.status_code == 201
    data: dict[str, Any] = response.json()
    return data


def _item_payload(
    product_id: Any,
    sku: str = "SKU-001",
    quantity: int = 1,
    unit_price: str = "10.00",
    total_price: str = "10.00",
) -> dict[str, Any]:
    return {
        "product_id": str(product_id),
        "sku": sku,
        "product_name": "Produto Teste",
        "quantity": quantity,
        "unit_price": unit_price,
        "total_price": total_price,
    }


def _order_payload(
    items: list[dict[str, Any]],
    external_id: str = "EXT-ITEMS-001",
) -> dict[str, Any]:
    return {
        "external_id": external_id,
        "marketplace": "bling",
        "order_number": "77777",
        "customer_name": "Cliente Teste",
        "status": "pending",
        "total_amount": "20.00",
        "ordered_at": "2026-07-31T10:00:00Z",
        "items": items,
    }


async def _create_product(
    session_factory: async_sessionmaker[AsyncSession],
    sku: str = "SKU-P-001",
    bling_id: str = "BL-P-001",
) -> Product:
    async with session_factory() as session:
        category = Category(id=uuid4(), bling_id="BL-C-001", name="Eletrônicos", active=True)
        session.add(category)
        await session.flush()
        product = Product(
            id=uuid4(),
            sku=sku,
            bling_id=bling_id,
            name="Produto Teste",
            category_id=category.id,
            price=Decimal("10.00"),
        )
        session.add(product)
        await session.commit()
        return product


async def test_list_orders_empty(api_client: AsyncClient) -> None:
    response = await api_client.get("/orders")

    assert response.status_code == 200
    assert response.json() == []


async def test_list_orders_returns_orders(api_client: AsyncClient) -> None:
    created = await _create_order(api_client)

    response = await api_client.get("/orders")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == created["id"]
    assert data[0]["external_id"] == "EXT-001"
    assert data[0]["items"] == []


async def test_list_orders_filter_by_status(api_client: AsyncClient) -> None:
    await _create_order(api_client, external_id="EXT-001", status="pending")
    await _create_order(api_client, external_id="EXT-002", status="completed")

    response = await api_client.get("/orders", params={"status": "completed"})

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["external_id"] == "EXT-002"
    assert data[0]["status"] == "completed"


async def test_list_orders_status_no_results(api_client: AsyncClient) -> None:
    await _create_order(api_client, external_id="EXT-001", status="pending")

    response = await api_client.get("/orders", params={"status": "cancelled"})

    assert response.status_code == 200
    assert response.json() == []


async def test_list_orders_invalid_status_returns_422(api_client: AsyncClient) -> None:
    response = await api_client.get("/orders", params={"status": "x" * 51})

    assert response.status_code == 422


async def test_update_order_single_field(api_client: AsyncClient) -> None:
    created = await _create_order(api_client)

    response = await api_client.put(f"/orders/{created['id']}", json={"customer_name": "Novo"})

    assert response.status_code == 200
    data = response.json()
    assert data["customer_name"] == "Novo"
    assert data["external_id"] == "EXT-001"
    assert data["status"] == "pending"


async def test_update_order_multiple_fields(api_client: AsyncClient) -> None:
    created = await _create_order(api_client)

    response = await api_client.put(
        f"/orders/{created['id']}",
        json={"customer_name": "Novo", "status": "completed", "notes": "Obs"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["customer_name"] == "Novo"
    assert data["status"] == "completed"
    assert data["notes"] == "Obs"


async def test_update_order_partial_preserves_fields(api_client: AsyncClient) -> None:
    created = await _create_order(api_client)

    response = await api_client.put(f"/orders/{created['id']}", json={"status": "completed"})

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert data["customer_name"] == "Cliente Teste"
    assert data["external_id"] == "EXT-001"
    assert data["total_amount"] == "100.00"


async def test_update_order_not_found(api_client: AsyncClient) -> None:
    response = await api_client.put(f"/orders/{uuid4()}", json={"customer_name": "Novo"})

    assert response.status_code == 404


async def test_update_order_conflict_returns_409(api_client: AsyncClient) -> None:
    created = await _create_order(api_client)

    response = await api_client.put(f"/orders/{created['id']}", json={"ordered_at": None})

    assert response.status_code == 409


async def test_update_order_invalid_payload_returns_422(api_client: AsyncClient) -> None:
    created = await _create_order(api_client)

    response = await api_client.put(f"/orders/{created['id']}", json={"total_amount": -1})

    assert response.status_code == 422


async def test_update_order_response_uses_schema(api_client: AsyncClient) -> None:
    created = await _create_order(api_client)

    response = await api_client.put(f"/orders/{created['id']}", json={"status": "completed"})

    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data
    assert "items" in data
    assert isinstance(data["items"], list)


async def test_patch_status_continues_functional(api_client: AsyncClient) -> None:
    created = await _create_order(api_client)

    response = await api_client.patch(
        f"/orders/{created['id']}/status", json={"status": "completed"}
    )

    assert response.status_code == 200
    assert response.json()["status"] == "completed"


async def test_get_order_by_id_continues_functional(api_client: AsyncClient) -> None:
    created = await _create_order(api_client)

    response = await api_client.get(f"/orders/{created['id']}")

    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


async def test_get_order_by_external_id_continues_functional(api_client: AsyncClient) -> None:
    await _create_order(api_client, external_id="EXT-001")

    response = await api_client.get("/orders/external/EXT-001")

    assert response.status_code == 200
    assert response.json()["external_id"] == "EXT-001"


async def test_post_continues_functional(api_client: AsyncClient) -> None:
    response = await api_client.post(
        "/orders",
        json={
            "external_id": "EXT-999",
            "order_number": "99999",
            "customer_name": "Cliente",
            "total_amount": "50.00",
            "ordered_at": "2026-07-31T10:00:00Z",
        },
    )

    assert response.status_code == 201
    assert response.json()["external_id"] == "EXT-999"


async def test_create_order_without_items_returns_empty_items(
    api_client: AsyncClient,
) -> None:
    response = await api_client.post("/orders", json=_order_payload([]))

    assert response.status_code == 201
    assert response.json()["items"] == []


async def test_create_order_with_item_returns_201(
    api_client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    product = await _create_product(session_factory)
    payload = _order_payload([_item_payload(product.id)])

    response = await api_client.post("/orders", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert len(data["items"]) == 1
    item = data["items"][0]
    assert item["product_id"] == str(product.id)
    assert item["sku"] == "SKU-001"
    assert item["quantity"] == 1
    assert item["unit_price"] == "10.00"
    assert item["total_price"] == "10.00"
    assert item["order_id"] == data["id"]


async def test_create_order_multiple_items_returns_items(
    api_client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    product = await _create_product(session_factory)
    payload = _order_payload(
        [
            _item_payload(product.id, sku="SKU-001", quantity=2, total_price="20.00"),
            _item_payload(product.id, sku="SKU-002", unit_price="5.00", total_price="5.00"),
        ]
    )

    response = await api_client.post("/orders", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert len(data["items"]) == 2
    assert [i["sku"] for i in data["items"]] == ["SKU-001", "SKU-002"]


async def test_create_order_invalid_item_returns_422(api_client: AsyncClient) -> None:
    payload = _order_payload([_item_payload(uuid4(), quantity=0)])

    response = await api_client.post("/orders", json=payload)

    assert response.status_code == 422


async def test_create_order_invalid_product_returns_409(api_client: AsyncClient) -> None:
    payload = _order_payload([_item_payload(uuid4())])

    response = await api_client.post("/orders", json=payload)

    assert response.status_code == 409


async def test_create_order_rolls_back_all_on_item_failure(
    api_client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    product = await _create_product(session_factory)
    payload = _order_payload(
        [
            _item_payload(product.id, sku="SKU-001"),
            _item_payload(uuid4(), sku="SKU-INVALID"),
        ]
    )

    response = await api_client.post("/orders", json=payload)

    assert response.status_code == 409

    async with session_factory() as session:
        order_count = await session.scalar(select(func.count()).select_from(Order))
        item_count = await session.scalar(select(func.count()).select_from(OrderItem))

    assert order_count == 0
    assert item_count == 0


async def test_delete_order_returns_204_no_body(api_client: AsyncClient) -> None:
    created = await _create_order(api_client)

    response = await api_client.delete(f"/orders/{created['id']}")

    assert response.status_code == 204
    assert response.content == b""


async def test_delete_missing_order_returns_404(api_client: AsyncClient) -> None:
    response = await api_client.delete(f"/orders/{uuid4()}")

    assert response.status_code == 404


async def test_delete_order_with_items_returns_204_and_removes_items(
    api_client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    product = await _create_product(session_factory)
    response = await api_client.post("/orders", json=_order_payload([_item_payload(product.id)]))
    assert response.status_code == 201
    order_id = response.json()["id"]

    delete_response = await api_client.delete(f"/orders/{order_id}")

    assert delete_response.status_code == 204
    assert delete_response.content == b""

    async with session_factory() as session:
        order_count = await session.scalar(select(func.count()).select_from(Order))
        item_count = await session.scalar(select(func.count()).select_from(OrderItem))
    assert order_count == 0
    assert item_count == 0


async def test_delete_does_not_affect_other_orders(
    api_client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    product = await _create_product(session_factory)
    first = await api_client.post(
        "/orders", json=_order_payload([_item_payload(product.id)], external_id="EXT-DEL-001")
    )
    assert first.status_code == 201
    second = await api_client.post(
        "/orders", json=_order_payload([_item_payload(product.id)], external_id="EXT-DEL-002")
    )
    assert second.status_code == 201
    first_order = first.json()
    second_order = second.json()

    delete_response = await api_client.delete(f"/orders/{first_order['id']}")

    assert delete_response.status_code == 204
    async with session_factory() as session:
        remaining_orders = (await session.scalars(select(Order))).all()
        remaining_items = (await session.scalars(select(OrderItem))).all()
    assert len(remaining_orders) == 1
    assert str(remaining_orders[0].id) == second_order["id"]
    assert len(remaining_items) == 1
    assert str(remaining_items[0].order_id) == second_order["id"]


async def test_get_after_delete_returns_404(api_client: AsyncClient) -> None:
    created = await _create_order(api_client)

    delete_response = await api_client.delete(f"/orders/{created['id']}")
    assert delete_response.status_code == 204

    get_response = await api_client.get(f"/orders/{created['id']}")

    assert get_response.status_code == 404
