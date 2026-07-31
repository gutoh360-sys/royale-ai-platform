from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.models.connection import IntegrationConnection
from backend.modules.integration.ports import IBlingConnectionRepository


class PostgresIntegrationConnectionRepository(IBlingConnectionRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self, provider: str) -> IntegrationConnection | None:
        stmt = select(IntegrationConnection).where(IntegrationConnection.provider == provider)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def lock_for_update(self, provider: str) -> IntegrationConnection | None:
        stmt = (
            select(IntegrationConnection)
            .where(IntegrationConnection.provider == provider)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def upsert(self, connection: IntegrationConnection) -> IntegrationConnection:
        stmt = select(IntegrationConnection).where(
            IntegrationConnection.provider == connection.provider
        )
        existing = await self._session.scalar(stmt)
        if existing is None:
            self._session.add(connection)
            await self._session.flush()
            return connection
        existing.access_token = connection.access_token
        existing.refresh_token = connection.refresh_token
        existing.company_id = connection.company_id
        existing.access_token_expires_at = connection.access_token_expires_at
        existing.refresh_token_expires_at = connection.refresh_token_expires_at
        existing.scopes = connection.scopes
        existing.status = connection.status
        existing.last_authenticated_at = connection.last_authenticated_at
        await self._session.flush()
        return existing
