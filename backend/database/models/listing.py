from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, Numeric, SmallInteger, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database.base import Base

if TYPE_CHECKING:
    from backend.database.models.product import Product
    from backend.database.models.sales_channel import SalesChannel


class Listing(Base):
    __tablename__ = "listings"
    __table_args__ = {"schema": "operational"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bling_id: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("operational.products.id", ondelete="SET NULL"),
        nullable=True,
    )
    product_bling_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    channel_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("operational.sales_channels.id", ondelete="SET NULL"),
        nullable=True,
    )
    channel_bling_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    status: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    price: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    external_code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    attributes: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    product: Mapped[Product | None] = relationship(
        "Product", back_populates="listings", lazy="selectin"
    )
    channel: Mapped[SalesChannel | None] = relationship(
        "SalesChannel", back_populates="listings", lazy="selectin"
    )
