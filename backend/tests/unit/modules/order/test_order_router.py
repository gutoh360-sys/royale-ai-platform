from collections.abc import AsyncGenerator
from typing import Any
from uuid import uuid4

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from backend.core.di import get_db_session


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
