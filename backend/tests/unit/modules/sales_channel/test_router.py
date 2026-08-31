from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from backend.core.config import get_settings
from backend.core.config.base import Settings
from backend.core.di import get_db_session

ADMIN_AUTH = ("royale-admin", "test-admin-password")


class _FakeScalars:
    def __init__(self, rows: list[SimpleNamespace]) -> None:
        self._rows = rows

    def all(self) -> list[SimpleNamespace]:
        return self._rows


class _FakeResult:
    def __init__(self, rows: list[SimpleNamespace]) -> None:
        self._rows = rows

    def scalars(self) -> _FakeScalars:
        return _FakeScalars(self._rows)


class _FakeSession:
    def __init__(self, rows: list[SimpleNamespace]) -> None:
        self._rows = rows

    async def execute(self, _stmt: object) -> _FakeResult:
        return _FakeResult(self._rows)


def _channel(bling_id: str, name: str, tipo: str) -> SimpleNamespace:
    now = datetime.now(UTC)
    return SimpleNamespace(
        id=uuid4(),
        bling_id=bling_id,
        name=name,
        tipo=tipo,
        agrupador=3,
        situacao=1,
        created_at=now,
        updated_at=now,
        last_synced_at=now,
    )


def _create_app(settings: Settings, rows: list[SimpleNamespace]) -> FastAPI:
    from backend.main import create_app

    async def override_session() -> _FakeSession:
        return _FakeSession(rows)

    app = create_app()
    app.dependency_overrides[get_settings] = lambda: settings.model_copy(
        update={
            "BLING_ADMIN_USERNAME": ADMIN_AUTH[0],
            "BLING_ADMIN_PASSWORD": ADMIN_AUTH[1],
        }
    )
    app.dependency_overrides[get_db_session] = override_session
    return app


@pytest.mark.asyncio
async def test_list_sales_channels_returns_real_rows(settings: Settings) -> None:
    app = _create_app(settings, [
        _channel("10", "Mercado Livre", "MERCADO_LIVRE"),
        _channel("20", "Shopee", "SHOPEE"),
    ])
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/sales-channels", auth=ADMIN_AUTH)

    assert response.status_code == 200
    data = response.json()
    assert [row["name"] for row in data] == ["Mercado Livre", "Shopee"]
    assert data[0]["tipo"] == "MERCADO_LIVRE"


@pytest.mark.asyncio
async def test_list_sales_channels_requires_admin_auth(settings: Settings) -> None:
    app = _create_app(settings, [])
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/sales-channels")

    assert response.status_code == 401
