from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database.base import Base

if TYPE_CHECKING:
    from backend.database.models.product import Product


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = {"schema": "operational"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bling_id: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("operational.categories.id", ondelete="SET NULL"),
        nullable=True,
    )
    path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    children: Mapped[list[Category]] = relationship(
        "Category", back_populates="parent", cascade="all", lazy="selectin"
    )
    parent: Mapped[Category | None] = relationship(
        "Category", back_populates="children", remote_side=[id], lazy="selectin"
    )
    products: Mapped[list[Product]] = relationship(
        "Product", back_populates="category", lazy="selectin"
    )
