from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..db import get_session
from ..models.ticket import Ticket
from ..models.comment import TicketComment
from ..schemas.comment import CommentCreateIn, CommentOut
from ..core.current_user import get_current_user
from ..models.user import User

router = APIRouter(tags=["comments"])

def is_staff(user: User) -> bool:
    return user.role in ("agent", "admin")

def get_ticket_or_404(session: Session, ticket_id: int) -> Ticket:
    t = session.get(Ticket, ticket_id)
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return t

def assert_access(user: User, ticket: Ticket):
    if is_staff(user):
        return
    if ticket.requester_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

@router.get("/tickets/{ticket_id}/comments", response_model=list[CommentOut])
def list_comments(
    ticket_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    ticket = get_ticket_or_404(session, ticket_id)
    assert_access(user, ticket)

    stmt = select(TicketComment).where(
        TicketComment.ticket_id == ticket_id
    ).order_by(TicketComment.id.asc())

    if not is_staff(user):
        stmt = stmt.where(TicketComment.is_internal == False)

    return list(session.scalars(stmt).all())

@router.post("/tickets/{ticket_id}/comments", response_model=CommentOut)
def create_comment(
    ticket_id: int,
    payload: CommentCreateIn,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    ticket = get_ticket_or_404(session, ticket_id)
    assert_access(user, ticket)

    comment = TicketComment(
        ticket_id=ticket_id,
        author_id=user.id,
        body=payload.body,
        is_internal=(payload.is_internal if is_staff(user) else False),
    )

    session.add(comment)
    # 업데이트 시각 갱신
    ticket.updated_at = datetime.utcnow()
    session.commit()
    session.refresh(comment)
    return comment
