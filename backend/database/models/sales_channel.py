from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, SmallInteger, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database.base import Base

if TYPE_CHECKING:
    from backend.database.models.listing import Listing
    from backend.database.models.product_channel import ProductChannel


class SalesChannel(Base):
    __tablename__ = "sales_channels"
    __table_args__ = {"schema": "operational"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bling_id: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    tipo: Mapped[str | None] = mapped_column(String(50), nullable=True)
    agrupador: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    situacao: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    product_channels: Mapped[list[ProductChannel]] = relationship(
        "ProductChannel", back_populates="channel", lazy="selectin"
    )
    listings: Mapped[list[Listing]] = relationship(
        "Listing", back_populates="channel", lazy="selectin"
    )
