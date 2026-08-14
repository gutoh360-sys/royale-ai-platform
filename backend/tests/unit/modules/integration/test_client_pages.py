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


def _page(items: list[dict[str, Any]]) -> dict[str, Any]:
    return {"data": items}


async def test_list_resource_fetches_next_page_after_full_page(settings: Settings) -> None:
    pages: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        page = request.url.params["pagina"]
        pages.append(page)
        if page == "1":
            return httpx.Response(200, json=_page([{"id": item} for item in range(100)]))
        return httpx.Response(200, json=_page([{"id": 100}]))

    client = _make_client(settings, handler)
    items = await client.list_resource("/categorias/produtos", _provider, {"limite": 100})

    assert len(items) == 101
    assert pages == ["1", "2"]


async def test_list_resource_stops_after_short_page(settings: Settings) -> None:
    pages: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        pages.append(request.url.params["pagina"])
        return httpx.Response(200, json=_page([{"id": item} for item in range(99)]))

    client = _make_client(settings, handler)
    items = await client.list_resource("/produtos", _provider, {"limite": 100})

    assert len(items) == 99
    assert pages == ["1"]


async def test_list_resource_stops_after_empty_page(settings: Settings) -> None:
    pages: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        page = request.url.params["pagina"]
        pages.append(page)
        items = [{"id": item} for item in range(100)] if page == "1" else []
        return httpx.Response(200, json=_page(items))

    client = _make_client(settings, handler)
    items = await client.list_resource("/produtos", _provider, {"limite": 100})

    assert len(items) == 100
    assert pages == ["1", "2"]


async def test_list_resource_empty_page_stops_with_zero_limit(settings: Settings) -> None:
    pages: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        pages.append(request.url.params["pagina"])
        return httpx.Response(200, json=_page([]))

    client = _make_client(settings, handler)
    items = await client.list_resource(
        "/produtos", _provider, {"limite": 0}, max_pages=2
    )

    assert items == []
    assert pages == ["1"]


async def test_list_resource_stops_after_oversized_page(settings: Settings) -> None:
    pages: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        pages.append(request.url.params["pagina"])
        return httpx.Response(200, json=_page([{"id": item} for item in range(101)]))

    client = _make_client(settings, handler)
    items = await client.list_resource(
        "/produtos", _provider, {"limite": 100}, max_pages=2
    )

    assert len(items) == 101
    assert pages == ["1"]


async def test_list_resource_respects_max_pages(settings: Settings) -> None:
    pages: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        page = request.url.params["pagina"]
        pages.append(page)
        return httpx.Response(200, json=_page([{"id": item} for item in range(100)]))

    client = _make_client(settings, handler)
    items = await client.list_resource(
        "/produtos", _provider, {"limite": 100}, max_pages=2
    )

    assert len(items) == 200
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
        return httpx.Response(200, json=_page([{"id": 1}]))

    client = _make_client(settings, handler)
    items = await client.fetch_products(_provider, page_size=50)

    assert items == [{"id": 1}]
    assert "pagina=1" in captured["url"]
    assert "limite=50" in captured["url"]
    assert "criterio=2" in captured["url"]
    assert "tipo=T" in captured["url"]
    assert captured["auth"] == "Bearer jwt-access"


async def test_fetch_products_uses_requested_page_size_to_continue(settings: Settings) -> None:
    pages: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        page = request.url.params["pagina"]
        pages.append(page)
        count = 50 if page == "1" else 1
        return httpx.Response(200, json=_page([{"id": item} for item in range(count)]))

    client = _make_client(settings, handler)
    items = await client.fetch_products(_provider, page_size=50, max_pages=3)

    assert len(items) == 51
    assert pages == ["1", "2"]


async def test_fetch_products_caps_pages_at_setting_default(settings: Settings) -> None:
    pages: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        page = request.url.params["pagina"]
        pages.append(page)
        return httpx.Response(200, json=_page([{"id": item} for item in range(100)]))

    settings.BLING_PRODUCT_SYNC_MAX_PAGES = 3
    client = _make_client(settings, handler)
    items = await client.fetch_products(_provider, page_size=100)

    assert len(items) == 300
    assert pages == ["1", "2", "3"]


async def test_fetch_orders_passes_date_filters(settings: Settings) -> None:
    captured: dict[str, Any] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        return httpx.Response(200, json=_page([]))

    client = _make_client(settings, handler)
    await client.fetch_orders(_provider, data_inicial="2026-01-01", data_final="2026-01-31")

    assert "dataInicial=2026-01-01" in captured["url"]
    assert "dataFinal=2026-01-31" in captured["url"]
