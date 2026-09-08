"""Server-side sync checkpoint persistence."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import JSON, Column, DateTime, Integer, String, Text, select, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.base import Base


class SyncCheckpoint(Base):
    """Persistent sync checkpoint for resumable operations."""

    __tablename__ = "sync_checkpoints"
    __table_args__ = {"schema": "operational"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity = Column(String(50), unique=True, nullable=False)
    current_page = Column(Integer, default=1)
    last_completed_page = Column(Integer, default=0)
    status = Column(String(20), default="idle")  # idle, running, paused, completed, failed
    totals = Column(JSON, default=dict)
    started_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    finished_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))


class CheckpointRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def claim_products(self, operation_id: str | None) -> SyncCheckpoint:
        return await self.claim_operation("products", operation_id)

    async def claim_operation(self, entity: str, operation_id: str | None) -> SyncCheckpoint:
        from fastapi import HTTPException

        # Transaction lock fences even a worker that outlives its Redis TTL.
        await self.acquire_guard()
        cp = await self.get(entity)
        now = datetime.now(UTC)
        totals = dict(cp.totals or {}) if cp else {}
        expires = datetime.fromisoformat(totals["expires_at"]) if totals.get("expires_at") else now
        owner = totals.get("operation_id")
        if cp and cp.status != "completed" and owner != operation_id and expires > now:
            raise HTTPException(409, "Operation owned by another browser; retry after TTL")
        if cp and cp.status == "completed" and owner and operation_id == owner:
            return cp
        if not cp or cp.status == "completed":
            totals = {}
            cp = await self.upsert(
                entity, current_page=1, last_completed_page=0, started_at=now, finished_at=None
            )
        if owner and owner != operation_id and expires <= now:
            totals["ttl_takeovers"] = totals.get("ttl_takeovers", 0) + 1
            totals["last_expired_at"] = expires.isoformat()
        totals.update(
            operation_id=operation_id or str(uuid.uuid4()),
            expires_at=(now + timedelta(minutes=10)).isoformat(),
        )
        return await self.upsert(entity, totals=totals, status="running", error_message=None)

    async def acquire_guard(self) -> None:
        from fastapi import HTTPException

        acquired = (
            await self.db.execute(text("SELECT pg_try_advisory_xact_lock(82471302)"))
        ).scalar()
        if not acquired:
            raise HTTPException(409, "Product batch already running")

    async def get(self, entity: str) -> SyncCheckpoint | None:
        result = await self.db.execute(
            select(SyncCheckpoint).where(SyncCheckpoint.entity == entity)
        )
        return result.scalar_one_or_none()

    async def upsert(self, entity: str, **kwargs) -> SyncCheckpoint:
        checkpoint = await self.get(entity)
        if checkpoint is None:
            checkpoint = SyncCheckpoint(entity=entity, **kwargs)
            self.db.add(checkpoint)
        else:
            for key, value in kwargs.items():
                setattr(checkpoint, key, value)
        checkpoint.updated_at = datetime.now(UTC)
        await self.db.flush()
        return checkpoint
