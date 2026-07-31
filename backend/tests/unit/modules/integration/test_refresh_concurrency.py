import asyncio
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from backend.core.config.base import Settings
from backend.core.security.encryption import EncryptionService
from backend.database.models.connection import IntegrationConnection
from backend.modules.integration.client import BlingApiClient
from backend.modules.integration.repository import PostgresIntegrationConnectionRepository
from backend.modules.integration.service import IntegrationConnectionService
from backend.modules.integration.state import OAuthStateService
from backend.tests.unit.modules.integration.conftest import FakeCache

BLING = "bling"


def _token_json(access: str = "refreshed-access") -> dict[str, Any]:
    return {
        "access_token": access,
        "refresh_token": "refreshed-refresh",
        "expires_in": 3600,
        "token_type": "Bearer",
        "scope": "a.b.c",
    }


async def test_concurrent_refresh_triggers_single_external_request(
    settings: Settings,
    crypto: EncryptionService,
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    refresh_calls = 0

    async with session_factory() as session:
        conn = IntegrationConnection(
            provider=BLING,
            company_id=None,
            access_token=crypto.encrypt("expired-access"),
            refresh_token=crypto.encrypt("refresh-1"),
            access_token_expires_at=datetime.now(UTC) - timedelta(minutes=5),
            refresh_token_expires_at=datetime.now(UTC) + timedelta(days=20),
            scopes="a.b.c",
            status="active",
            last_authenticated_at=datetime.now(UTC),
        )
        session.add(conn)
        await session.commit()

    async def on_token(request: httpx.Request) -> httpx.Response:
        nonlocal refresh_calls
        refresh_calls += 1
        await asyncio.sleep(0.3)
        return httpx.Response(200, json=_token_json())

    async def make_service(session: AsyncSession) -> IntegrationConnectionService:
        repo = PostgresIntegrationConnectionRepository(session)
        state = OAuthStateService(FakeCache(), 60)
        transport = httpx.MockTransport(on_token)
        http = httpx.AsyncClient(transport=transport, timeout=httpx.Timeout(2.0))
        client = BlingApiClient(settings, client=http)
        return IntegrationConnectionService(repo, state, client, crypto, settings)

    async def run(svc: IntegrationConnectionService, session: AsyncSession) -> str:
        try:
            token = await svc.get_valid_access_token()
            await session.commit()
            return token
        finally:
            await session.close()

    session1 = session_factory()
    session2 = session_factory()
    service1 = await make_service(session1)
    service2 = await make_service(session2)

    async with asyncio.TaskGroup() as tg:
        task1 = tg.create_task(run(service1, session1))
        await asyncio.sleep(0.1)
        task2 = tg.create_task(run(service2, session2))
        token1 = await task1
        token2 = await task2

    assert refresh_calls == 1
    assert token1 == "refreshed-access"
    assert token2 == "refreshed-access"
