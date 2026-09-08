"""Server-side sync checkpoint persistence."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, Integer, JSON, String, Text, select
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
