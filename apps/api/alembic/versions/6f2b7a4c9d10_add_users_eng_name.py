"""add users eng_name

Revision ID: 6f2b7a4c9d10
Revises: 4b4a1d3b7b1a
Create Date: 2026-01-19 09:35:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "6f2b7a4c9d10"
down_revision = "4b4a1d3b7b1a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("eng_name", sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "eng_name")
