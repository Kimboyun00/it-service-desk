"""DB operational improvements: indexes, FK ondelete, CHECK constraints

Revision ID: g4c5d6e7f8a9
Revises: b3c4d5e6f7a8
Create Date: 2026-02-01 12:00:00.000000

- tickets: 인덱스 추가 (status, created_at, requester_emp_no, assignee_emp_no)
- mail_logs.ticket_id, attachments.ticket_id/notice_id: ON DELETE SET NULL
- tickets.status, users.role, knowledge_items.kind: CHECK 제약
"""

from alembic import op


revision = "g4c5d6e7f8a9"
down_revision = "b3c4d5e6f7a8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1) tickets 인덱스 (목록/필터/통계 쿼리 성능)
    op.create_index("ix_tickets_status", "tickets", ["status"], unique=False)
    op.create_index("ix_tickets_created_at", "tickets", ["created_at"], unique=False)
    op.create_index("ix_tickets_requester_emp_no", "tickets", ["requester_emp_no"], unique=False)
    op.create_index("ix_tickets_assignee_emp_no", "tickets", ["assignee_emp_no"], unique=False)
    op.create_index("ix_tickets_category_id", "tickets", ["category_id"], unique=False)
    op.create_index(
        "ix_tickets_status_created_at",
        "tickets",
        ["status", "created_at"],
        unique=False,
    )

    # 2) mail_logs.ticket_id: ON DELETE SET NULL (티켓 삭제 시 로그는 보존, ticket_id만 NULL)
    op.execute(
        "ALTER TABLE mail_logs DROP CONSTRAINT IF EXISTS mail_logs_ticket_id_fkey"
    )
    op.execute(
        """
        ALTER TABLE mail_logs
        ADD CONSTRAINT mail_logs_ticket_id_fkey
        FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE SET NULL
        """
    )

    # 3) attachments.ticket_id, comment_id, notice_id: ON DELETE SET NULL
    op.execute(
        "ALTER TABLE attachments DROP CONSTRAINT IF EXISTS attachments_ticket_id_fkey"
    )
    op.execute(
        """
        ALTER TABLE attachments
        ADD CONSTRAINT attachments_ticket_id_fkey
        FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE SET NULL
        """
    )
    op.execute(
        "ALTER TABLE attachments DROP CONSTRAINT IF EXISTS attachments_comment_id_fkey"
    )
    op.execute(
        """
        ALTER TABLE attachments
        ADD CONSTRAINT attachments_comment_id_fkey
        FOREIGN KEY (comment_id) REFERENCES ticket_comments(id) ON DELETE SET NULL
        """
    )
    op.execute(
        "ALTER TABLE attachments DROP CONSTRAINT IF EXISTS attachments_notice_id_fkey"
    )
    op.execute(
        """
        ALTER TABLE attachments
        ADD CONSTRAINT attachments_notice_id_fkey
        FOREIGN KEY (notice_id) REFERENCES knowledge_items(id) ON DELETE SET NULL
        """
    )

    # 4) CHECK 제약 (도메인 값 검증)
    op.execute(
        """
        ALTER TABLE tickets
        ADD CONSTRAINT chk_tickets_status
        CHECK (status IN ('open', 'in_progress', 'resolved', 'closed'))
        """
    )
    op.execute(
        """
        ALTER TABLE users
        ADD CONSTRAINT chk_users_role
        CHECK (role IN ('requester', 'admin'))
        """
    )
    op.execute(
        """
        ALTER TABLE knowledge_items
        ADD CONSTRAINT chk_knowledge_items_kind
        CHECK (kind IN ('notice', 'faq'))
        """
    )


def downgrade() -> None:
    # CHECK 제약 제거
    op.execute("ALTER TABLE tickets DROP CONSTRAINT IF EXISTS chk_tickets_status")
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role")
    op.execute(
        "ALTER TABLE knowledge_items DROP CONSTRAINT IF EXISTS chk_knowledge_items_kind"
    )

    # attachments FK 원복 (ON DELETE 미지정 = RESTRICT)
    op.execute(
        "ALTER TABLE attachments DROP CONSTRAINT IF EXISTS attachments_notice_id_fkey"
    )
    op.execute(
        """
        ALTER TABLE attachments
        ADD CONSTRAINT attachments_notice_id_fkey
        FOREIGN KEY (notice_id) REFERENCES knowledge_items(id)
        """
    )
    op.execute(
        "ALTER TABLE attachments DROP CONSTRAINT IF EXISTS attachments_comment_id_fkey"
    )
    op.execute(
        """
        ALTER TABLE attachments
        ADD CONSTRAINT attachments_comment_id_fkey
        FOREIGN KEY (comment_id) REFERENCES ticket_comments(id)
        """
    )
    op.execute(
        "ALTER TABLE attachments DROP CONSTRAINT IF EXISTS attachments_ticket_id_fkey"
    )
    op.execute(
        """
        ALTER TABLE attachments
        ADD CONSTRAINT attachments_ticket_id_fkey
        FOREIGN KEY (ticket_id) REFERENCES tickets(id)
        """
    )

    # mail_logs FK 원복
    op.execute(
        "ALTER TABLE mail_logs DROP CONSTRAINT IF EXISTS mail_logs_ticket_id_fkey"
    )
    op.execute(
        """
        ALTER TABLE mail_logs
        ADD CONSTRAINT mail_logs_ticket_id_fkey
        FOREIGN KEY (ticket_id) REFERENCES tickets(id)
        """
    )

    # tickets 인덱스 제거
    op.drop_index("ix_tickets_status_created_at", table_name="tickets")
    op.drop_index("ix_tickets_category_id", table_name="tickets")
    op.drop_index("ix_tickets_assignee_emp_no", table_name="tickets")
    op.drop_index("ix_tickets_requester_emp_no", table_name="tickets")
    op.drop_index("ix_tickets_created_at", table_name="tickets")
    op.drop_index("ix_tickets_status", table_name="tickets")
