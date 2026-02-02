"""Add ticket reopens (재요청): reopen_count, ticket_reopens, comment/attachment reopen_id

Revision ID: h5d6e7f8a9b0
Revises: g4c5d6e7f8a9
Create Date: 2026-02-01 14:00:00.000000

- tickets.reopen_count (integer, default 0)
- ticket_reopens (id, ticket_id, description, requester_emp_no, created_at)
- ticket_comments.reopen_id (nullable FK)
- attachments.reopen_id (nullable FK)
"""

from alembic import op
import sqlalchemy as sa


revision = "h5d6e7f8a9b0"
down_revision = "g4c5d6e7f8a9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tickets", sa.Column("reopen_count", sa.Integer(), nullable=False, server_default="0"))

    op.create_table(
        "ticket_reopens",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("ticket_id", sa.Integer(), sa.ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("requester_emp_no", sa.String(50), sa.ForeignKey("users.emp_no"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_ticket_reopens_ticket_id", "ticket_reopens", ["ticket_id"], unique=False)

    op.add_column(
        "ticket_comments",
        sa.Column("reopen_id", sa.Integer(), sa.ForeignKey("ticket_reopens.id", ondelete="SET NULL"), nullable=True),
    )
    op.create_index("ix_ticket_comments_reopen_id", "ticket_comments", ["reopen_id"], unique=False)

    op.add_column(
        "attachments",
        sa.Column("reopen_id", sa.Integer(), sa.ForeignKey("ticket_reopens.id", ondelete="SET NULL"), nullable=True),
    )
    op.create_index("ix_attachments_reopen_id", "attachments", ["reopen_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_attachments_reopen_id", table_name="attachments")
    op.drop_column("attachments", "reopen_id")
    op.drop_index("ix_ticket_comments_reopen_id", table_name="ticket_comments")
    op.drop_column("ticket_comments", "reopen_id")
    op.drop_index("ix_ticket_reopens_ticket_id", table_name="ticket_reopens")
    op.drop_table("ticket_reopens")
    op.drop_column("tickets", "reopen_count")
