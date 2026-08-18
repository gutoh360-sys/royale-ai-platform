from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database.base import Base

if TYPE_CHECKING:
    from backend.database.models.product import Product
    from backend.database.models.sales_channel import SalesChannel


class ProductChannel(Base):
    __tablename__ = "product_channels"
    __table_args__ = {"schema": "operational"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bling_id: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("operational.products.id", ondelete="CASCADE"),
        nullable=False,
    )
    channel_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("operational.sales_channels.id", ondelete="CASCADE"),
        nullable=False,
    )
    codigo: Mapped[str | None] = mapped_column(String(100), nullable=True)
    preco: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    preco_promocional: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    categoria_ids: Mapped[list[Any] | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    product: Mapped[Product] = relationship(
        "Product", back_populates="channel_links", lazy="selectin"
    )
    channel: Mapped[SalesChannel] = relationship(
        "SalesChannel", back_populates="product_channels", lazy="selectin"
    )
