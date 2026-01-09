from datetime import datetime, timedelta
import json
from fastapi import APIRouter, Depends
from sqlalchemy import select, desc
from sqlalchemy.orm import Session

from ..db import get_session
from ..core.current_user import get_current_user
from ..models.event import TicketEvent
from ..models.ticket import Ticket
from ..models.comment import TicketComment
from ..models.user import User
from ..schemas.notification import NotificationOut

router = APIRouter(tags=["notifications"])


def is_staff(user: User) -> bool:
    return user.role in ("agent", "admin")


def _event_message(event: TicketEvent) -> str:
    if event.type == "status_changed":
        if event.from_value or event.to_value:
            return f"{event.from_value or '-'} -> {event.to_value or '-'}"
    if event.type in ("assignee_assigned", "assignee_changed"):
        if event.note:
            return event.note
    if event.type == "requester_updated" and event.note:
        try:
            payload = json.loads(event.note)
            summary = payload.get("summary")
            if isinstance(summary, str) and summary.strip():
                return summary
        except Exception:
            return event.note
    return event.note or ""


@router.get("/notifications", response_model=list[NotificationOut])
def list_notifications(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    items: list[NotificationOut] = []

    # 1) Ticket events for the user's own requests
    event_stmt = (
        select(TicketEvent, Ticket)
        .join(Ticket, TicketEvent.ticket_id == Ticket.id)
        .where(Ticket.requester_id == user.id)
        .order_by(desc(TicketEvent.created_at), desc(TicketEvent.id))
        .limit(50)
    )
    for event, ticket in session.execute(event_stmt).all():
        created_at = event.created_at or ticket.updated_at or ticket.created_at
        if not created_at:
            continue
        items.append(
            NotificationOut(
                id=f"event:{event.id}",
                ticket_id=ticket.id,
                ticket_title=ticket.title,
                type=event.type,
                message=_event_message(event),
                created_at=created_at,
            )
        )

    if is_staff(user):
        cutoff = datetime.utcnow() - timedelta(days=30)

        # 2) New tickets for staff
        new_stmt = (
            select(Ticket)
            .where(Ticket.created_at >= cutoff)
            .order_by(desc(Ticket.created_at), desc(Ticket.id))
            .limit(50)
        )
        for ticket in session.scalars(new_stmt).all():
            items.append(
                NotificationOut(
                    id=f"ticket:{ticket.id}",
                    ticket_id=ticket.id,
                    ticket_title=ticket.title,
                    type="new_ticket",
                    message="새 요청이 등록되었습니다.",
                    created_at=ticket.created_at,
                )
            )

        # 3) Requester comments on assigned tickets
        comment_stmt = (
            select(TicketComment, Ticket, User)
            .join(Ticket, TicketComment.ticket_id == Ticket.id)
            .join(User, TicketComment.author_id == User.id)
            .where(Ticket.assignee_id == user.id)
            .where(TicketComment.is_internal == False)
            .where(User.role == "requester")
            .order_by(desc(TicketComment.created_at), desc(TicketComment.id))
            .limit(50)
        )
        for comment, ticket, author in session.execute(comment_stmt).all():
            created_at = comment.created_at or ticket.updated_at or ticket.created_at
            if not created_at:
                continue
            snippet = comment.body or ""
            if len(snippet) > 120:
                snippet = snippet[:120].rstrip() + "..."
            items.append(
                NotificationOut(
                    id=f"comment:{comment.id}",
                    ticket_id=ticket.id,
                    ticket_title=ticket.title,
                    type="requester_commented",
                    message=snippet,
                    created_at=created_at,
                )
            )

    items.sort(key=lambda i: i.created_at, reverse=True)
    return items[:50]
