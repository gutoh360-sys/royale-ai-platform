"""Add sales channels, product channels and listings for Phase 1 Bling data.

Revision ID: a7f3c9e1b2d4
Revises: 8f2a1c6d4b9e
Create Date: 2026-08-18 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "a7f3c9e1b2d4"
down_revision: str | None = "8f2a1c6d4b9e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "sales_channels",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("bling_id", sa.String(50), nullable=False, unique=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("tipo", sa.String(50), nullable=True),
        sa.Column("agrupador", sa.SmallInteger(), nullable=True),
        sa.Column("situacao", sa.SmallInteger(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        schema="operational",
    )

    op.create_table(
        "product_channels",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("bling_id", sa.String(50), nullable=False, unique=True),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("channel_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("codigo", sa.String(100), nullable=True),
        sa.Column("preco", sa.Numeric(12, 2), nullable=True),
        sa.Column("preco_promocional", sa.Numeric(12, 2), nullable=True),
        sa.Column("categoria_ids", postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["operational.products.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["channel_id"],
            ["operational.sales_channels.id"],
            ondelete="CASCADE",
        ),
        schema="operational",
    )

    op.create_table(
        "listings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("bling_id", sa.String(50), nullable=False, unique=True),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("product_bling_id", sa.String(50), nullable=True),
        sa.Column("channel_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("channel_bling_id", sa.String(50), nullable=True),
        sa.Column("title", sa.String(200), nullable=True),
        sa.Column("status", sa.SmallInteger(), nullable=True),
        sa.Column("price", sa.Numeric(12, 2), nullable=True),
        sa.Column("external_code", sa.String(100), nullable=True),
        sa.Column("attributes", postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["operational.products.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["channel_id"],
            ["operational.sales_channels.id"],
            ondelete="SET NULL",
        ),
        schema="operational",
    )

    op.drop_constraint(
        "ck_sync_logs_entity_valid",
        "sync_logs",
        type_="check",
        schema="operational",
    )
    op.create_check_constraint(
        "ck_sync_logs_entity_valid",
        "sync_logs",
        "entity = ANY(ARRAY['products', 'orders', 'marketplaces', 'product_channels', 'listings'])",
        schema="operational",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_sync_logs_entity_valid",
        "sync_logs",
        type_="check",
        schema="operational",
    )
    op.create_check_constraint(
        "ck_sync_logs_entity_valid",
        "sync_logs",
        "entity = ANY(ARRAY['products', 'orders'])",
        schema="operational",
    )
    op.drop_table("listings", schema="operational")
    op.drop_table("product_channels", schema="operational")
    op.drop_table("sales_channels", schema="operational")
