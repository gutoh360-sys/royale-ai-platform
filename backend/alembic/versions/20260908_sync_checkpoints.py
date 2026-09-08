"""Add sync_checkpoints table for resumable sync operations.

Revision ID: f7a1b2c3d4e5
Revises: b8d2e4f6a1c3
Create Date: 2026-09-08 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "f7a1b2c3d4e5"
down_revision: str | None = "b8d2e4f6a1c3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "sync_checkpoints",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("entity", sa.String(50), nullable=False, unique=True),
        sa.Column("current_page", sa.Integer(), server_default="1"),
        sa.Column("last_completed_page", sa.Integer(), server_default="0"),
        sa.Column("status", sa.String(20), server_default="idle"),
        sa.Column("totals", postgresql.JSONB(), server_default="{}"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        schema="operational",
    )


def downgrade() -> None:
    op.drop_table("sync_checkpoints", schema="operational")
