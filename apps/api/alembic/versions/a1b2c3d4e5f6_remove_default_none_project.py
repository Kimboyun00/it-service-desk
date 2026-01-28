"""remove default '없음' project

Revision ID: a1b2c3d4e5f6
Revises: f2b3c4d5e6f7
Create Date: 2026-02-01 00:00:00.000000

기본으로 생성되던 '없음' 프로젝트를 제거합니다.
이미 c2d7b1a4e9f0 마이그레이션으로 생성된 DB에서 해당 프로젝트를 삭제합니다.
"""

from alembic import op
import sqlalchemy as sa


revision = "a1b2c3d4e5f6"
down_revision = "f2b3c4d5e6f7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    # '없음' 프로젝트를 참조하는 티켓/임시저장은 project_id를 null로
    conn.execute(
        sa.text("update tickets set project_id = null where project_id in (select id from projects where name = :name)"),
        {"name": "없음"},
    )
    conn.execute(
        sa.text("update draft_tickets set project_id = null where project_id in (select id from projects where name = :name)"),
        {"name": "없음"},
    )
    conn.execute(
        sa.text("delete from project_members where project_id in (select id from projects where name = :name)"),
        {"name": "없음"},
    )
    conn.execute(sa.text("delete from projects where name = :name"), {"name": "없음"})


def downgrade() -> None:
    # 기본 프로젝트 복원은 하지 않음 (제거 방침 유지)
    pass
