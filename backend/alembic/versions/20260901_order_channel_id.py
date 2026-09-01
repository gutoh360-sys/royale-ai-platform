"""Add channel_id FK to orders for marketplace attribution.

Revision ID: b8d2e4f6a1c3
Revises: a7f3c9e1b2d4
Create Date: 2026-09-01 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "b8d2e4f6a1c3"
down_revision: str | None = "a7f3c9e1b2d4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "orders",
        sa.Column(
            "channel_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        schema="operational",
    )
    op.create_foreign_key(
        "fk_orders_channel_id",
        "orders",
        "sales_channels",
        ["channel_id"],
        ["id"],
        ondelete="SET NULL",
        source_schema="operational",
        referent_schema="operational",
    )


def downgrade() -> None:
    op.drop_constraint("fk_orders_channel_id", "orders", schema="operational")
    op.drop_column("orders", "channel_id", schema="operational")
