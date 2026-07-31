from collections.abc import AsyncGenerator
from typing import Any
from uuid import uuid4

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from backend.core.di import get_db_session
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


async def _create_category(client: AsyncClient, bling_id: str = "B001") -> dict[str, Any]:
    response = await client.post("/categories", json={"bling_id": bling_id, "name": "Eletrônicos"})
    assert response.status_code == 201
    data: dict[str, Any] = response.json()
    return data


async def test_list_categories_empty(api_client: AsyncClient) -> None:
    response = await api_client.get("/categories")

    assert response.status_code == 200
    assert response.json() == []


async def test_list_categories_returns_categories(api_client: AsyncClient) -> None:
    created = await _create_category(api_client)

    response = await api_client.get("/categories")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == created["id"]
    assert data[0]["name"] == "Eletrônicos"


async def test_update_category_single_field(api_client: AsyncClient) -> None:
    created = await _create_category(api_client)

    response = await api_client.put(f"/categories/{created['id']}", json={"name": "Tecnologia"})

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Tecnologia"
    assert data["bling_id"] == "B001"
    assert data["active"] is True


async def test_update_category_multiple_fields(api_client: AsyncClient) -> None:
    created = await _create_category(api_client)

    response = await api_client.put(
        f"/categories/{created['id']}", json={"name": "Tecnologia", "active": False}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Tecnologia"
    assert data["active"] is False


async def test_update_category_not_found(api_client: AsyncClient) -> None:
    response = await api_client.put(f"/categories/{uuid4()}", json={"name": "Tecnologia"})

    assert response.status_code == 404


async def test_update_category_cannot_change_id(api_client: AsyncClient) -> None:
    created = await _create_category(api_client)

    response = await api_client.put(f"/categories/{created['id']}", json={"id": str(uuid4())})

    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


async def test_update_category_partial_preserves_fields(api_client: AsyncClient) -> None:
    created = await _create_category(api_client)

    response = await api_client.put(f"/categories/{created['id']}", json={"name": "Novo"})

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Novo"
    assert data["active"] is True
    assert data["bling_id"] == "B001"


async def test_delete_category_success(api_client: AsyncClient) -> None:
    created = await _create_category(api_client)

    response = await api_client.delete(f"/categories/{created['id']}")

    assert response.status_code == 204

    response = await api_client.get("/categories")
    assert response.json() == []


async def test_delete_category_not_found(api_client: AsyncClient) -> None:
    response = await api_client.delete(f"/categories/{uuid4()}")

    assert response.status_code == 404


async def test_delete_category_conflict_with_product(
    api_client: AsyncClient,
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    created = await _create_category(api_client)
    async with session_factory() as session:
        session.add(
            Product(
                id=uuid4(),
                sku="SKU-001",
                bling_id="P001",
                name="Produto",
                category_id=created["id"],
                price=10,
            )
        )
        await session.commit()

    response = await api_client.delete(f"/categories/{created['id']}")

    assert response.status_code == 409
