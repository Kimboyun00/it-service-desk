"""add project sort order

Revision ID: e1a2b3c4d5f6
Revises: c2d7b1a4e9f0
Create Date: 2026-01-27 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "e1a2b3c4d5f6"
down_revision = "c2d7b1a4e9f0"
branch_labels = None
depends_on = None


def upgrade() -> None:
  # 프로젝트 정렬 순서 컬럼 추가 (기본값 999)
  op.add_column(
      "projects",
      sa.Column("sort_order", sa.Integer(), nullable=False, server_default="999"),
  )


def downgrade() -> None:
  op.drop_column("projects", "sort_order")

