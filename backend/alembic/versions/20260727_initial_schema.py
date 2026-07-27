"""Initial schema for Sprint 1 - Operational domain.

Revision ID: e1accea666d0
Revises:
Create Date: 2026-07-27 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "e1accea666d0"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS operational")

    op.create_table(
        "categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("bling_id", sa.String(50), nullable=False, unique=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("path", sa.String(500), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
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
        sa.ForeignKeyConstraint(["parent_id"], ["operational.categories.id"], ondelete="SET NULL"),
        schema="operational",
    )

    op.create_table(
        "products",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("sku", sa.String(50), nullable=False, unique=True),
        sa.Column("bling_id", sa.String(50), nullable=False, unique=True),
        sa.Column("ean", sa.String(13), nullable=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("brand", sa.String(100), nullable=True),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("price", sa.Numeric(12, 2), nullable=False, server_default=sa.text("0")),
        sa.Column("cost", sa.Numeric(12, 2), nullable=True, server_default=sa.text("0")),
        sa.Column("stock_quantity", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
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
            ["category_id"], ["operational.categories.id"], ondelete="RESTRICT"
        ),
        sa.CheckConstraint("price >= 0", name="ck_products_price_positive"),
        sa.CheckConstraint("stock_quantity >= 0", name="ck_products_stock_non_negative"),
        schema="operational",
    )

    op.create_table(
        "product_images",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("url", sa.String(500), nullable=False),
        sa.Column("alt", sa.String(200), nullable=True),
        sa.Column("position", sa.SmallInteger(), nullable=False, server_default=sa.text("0")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["product_id"], ["operational.products.id"], ondelete="CASCADE"),
        schema="operational",
    )

    op.create_table(
        "orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("external_id", sa.String(50), nullable=False),
        sa.Column("marketplace", sa.String(50), nullable=False, server_default=sa.text("'bling'")),
        sa.Column("order_number", sa.String(50), nullable=False),
        sa.Column("customer_name", sa.String(200), nullable=False),
        sa.Column("customer_document", sa.String(20), nullable=True),
        sa.Column("customer_email", sa.String(200), nullable=True),
        sa.Column("customer_phone", sa.String(20), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default=sa.text("'pending'")),
        sa.Column("total_amount", sa.Numeric(12, 2), nullable=False, server_default=sa.text("0")),
        sa.Column("shipping_amount", sa.Numeric(12, 2), nullable=True, server_default=sa.text("0")),
        sa.Column("discount_amount", sa.Numeric(12, 2), nullable=True, server_default=sa.text("0")),
        sa.Column("payment_method", sa.String(100), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("ordered_at", sa.DateTime(timezone=True), nullable=False),
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
        sa.CheckConstraint("total_amount >= 0", name="ck_orders_total_positive"),
        schema="operational",
    )

    op.create_table(
        "order_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sku", sa.String(50), nullable=False),
        sa.Column("product_name", sa.String(200), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column("unit_price", sa.Numeric(12, 2), nullable=False, server_default=sa.text("0")),
        sa.Column("total_price", sa.Numeric(12, 2), nullable=False, server_default=sa.text("0")),
        sa.Column("cost", sa.Numeric(12, 2), nullable=True, server_default=sa.text("0")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["order_id"], ["operational.orders.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["product_id"], ["operational.products.id"], ondelete="RESTRICT"),
        sa.CheckConstraint("quantity > 0", name="ck_order_items_quantity_positive"),
        sa.CheckConstraint("unit_price >= 0", name="ck_order_items_unit_price_positive"),
        schema="operational",
    )

    op.create_table(
        "sync_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("sync_type", sa.String(20), nullable=False),
        sa.Column("entity", sa.String(20), nullable=False),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default=sa.text("'running'")),
        sa.Column("items_processed", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("items_created", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("items_updated", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("items_failed", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.CheckConstraint(
            "sync_type = ANY(ARRAY['full', 'incremental'])",
            name="ck_sync_logs_type_valid",
        ),
        sa.CheckConstraint(
            "entity = ANY(ARRAY['products', 'orders'])",
            name="ck_sync_logs_entity_valid",
        ),
        sa.CheckConstraint(
            "status = ANY(ARRAY['running', 'completed', 'failed'])",
            name="ck_sync_logs_status_valid",
        ),
        schema="operational",
    )

    op.create_table(
        "sync_errors",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("sync_log_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("entity", sa.String(20), nullable=False),
        sa.Column("external_id", sa.String(50), nullable=True),
        sa.Column("error_type", sa.String(50), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=False),
        sa.Column("raw_data", postgresql.JSONB(), nullable=True),
        sa.Column("retry_count", sa.SmallInteger(), nullable=False, server_default=sa.text("0")),
        sa.Column("resolved", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["sync_log_id"], ["operational.sync_logs.id"], ondelete="CASCADE"),
        schema="operational",
    )


def downgrade() -> None:
    op.execute("DROP SCHEMA IF EXISTS operational CASCADE")
