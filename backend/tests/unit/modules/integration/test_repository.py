from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.security.encryption import EncryptionService
from backend.database.models.connection import IntegrationConnection
from backend.modules.integration.repository import PostgresIntegrationConnectionRepository


async def _seed(
    session: AsyncSession,
    crypto: EncryptionService,
    access: str = "plain-access",
    refresh: str = "plain-refresh",
) -> IntegrationConnection:
    conn = IntegrationConnection(
        provider="bling",
        company_id=None,
        access_token=crypto.encrypt(access),
        refresh_token=crypto.encrypt(refresh),
        access_token_expires_at=datetime.now(UTC) + timedelta(hours=1),
        refresh_token_expires_at=datetime.now(UTC) + timedelta(days=29),
        scopes="a.b.c",
        status="active",
        last_authenticated_at=datetime.now(UTC),
    )
    session.add(conn)
    await session.commit()
    return conn


async def test_get_returns_seeded_connection(
    db_session: AsyncSession,
    crypto: EncryptionService,
) -> None:
    seeded = await _seed(db_session, crypto)

    repo = PostgresIntegrationConnectionRepository(db_session)
    conn = await repo.get("bling")

    assert conn is not None
    assert conn.id == seeded.id
    assert conn.access_token is not None
    assert crypto.decrypt(conn.access_token) == "plain-access"


async def test_get_returns_none_when_missing(db_session: AsyncSession) -> None:
    repo = PostgresIntegrationConnectionRepository(db_session)
    assert await repo.get("bling") is None


async def test_upsert_updates_same_row_not_duplicate(
    db_session: AsyncSession,
    crypto: EncryptionService,
) -> None:
    await _seed(db_session, crypto)
    repo = PostgresIntegrationConnectionRepository(db_session)
    updated = IntegrationConnection(
        provider="bling",
        company_id=None,
        access_token=crypto.encrypt("new-access"),
        refresh_token=crypto.encrypt("new-refresh"),
        access_token_expires_at=datetime.now(UTC) + timedelta(hours=2),
        refresh_token_expires_at=datetime.now(UTC) + timedelta(days=30),
        scopes="a.b.d",
        status="active",
        last_authenticated_at=datetime.now(UTC),
    )

    saved = await repo.upsert(updated)
    await db_session.commit()

    count = await db_session.scalar(select(func.count()).select_from(IntegrationConnection))
    assert count == 1
    assert saved.access_token is not None
    assert crypto.decrypt(saved.access_token) == "new-access"
    assert saved.scopes == "a.b.d"


async def test_tokens_with_more_than_3000_chars_persist(
    db_session: AsyncSession,
    crypto: EncryptionService,
) -> None:
    access = "a" * 3500
    refresh = "r" * 3200
    await _seed(db_session, crypto, access=access, refresh=refresh)
    repo = PostgresIntegrationConnectionRepository(db_session)

    conn = await repo.get("bling")

    assert conn is not None
    assert conn.access_token is not None
    assert conn.refresh_token is not None
    assert conn.access_token != access
    assert conn.refresh_token != refresh
    assert crypto.decrypt(conn.access_token) == access
    assert crypto.decrypt(conn.refresh_token) == refresh


async def test_lock_for_update_returns_row(
    db_session: AsyncSession,
    crypto: EncryptionService,
) -> None:
    await _seed(db_session, crypto)
    repo = PostgresIntegrationConnectionRepository(db_session)

    conn = await repo.lock_for_update("bling")

    assert conn is not None
    assert conn.provider == "bling"
