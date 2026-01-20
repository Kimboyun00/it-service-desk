"""add notice_id to attachments

Revision ID: 7c8e4a9b1f2c
Revises: 6f2b7a4c9d10
Create Date: 2026-01-19 16:40:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "7c8e4a9b1f2c"
down_revision = "6f2b7a4c9d10"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("attachments", sa.Column("notice_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "attachments_notice_id_fkey",
        "attachments",
        "knowledge_items",
        ["notice_id"],
        ["id"],
    )
    op.create_index("ix_attachments_notice_id", "attachments", ["notice_id"])


def downgrade() -> None:
    op.drop_index("ix_attachments_notice_id", table_name="attachments")
    op.drop_constraint("attachments_notice_id_fkey", "attachments", type_="foreignkey")
    op.drop_column("attachments", "notice_id")
