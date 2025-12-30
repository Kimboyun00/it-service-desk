from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..db import get_session
from ..models.ticket import Ticket
from ..schemas.ticket import TicketCreateIn, TicketOut
from ..core.current_user import get_current_user  # 아래에서 파일 만들거임
from ..models.user import User

router = APIRouter(prefix="/tickets", tags=["tickets"])

def is_agent(user: User) -> bool:
    return user.role in ("agent", "admin")

@router.post("", response_model=TicketOut)
def create_ticket(
    payload: TicketCreateIn,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    t = Ticket(
        title=payload.title,
        description=payload.description,
        priority=payload.priority,
        category=payload.category,
        requester_id=user.id,
    )
    session.add(t)
    session.commit()
    session.refresh(t)
    return t

@router.get("", response_model=list[TicketOut])
def list_tickets(
    mine: bool = Query(default=True),
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    stmt = select(Ticket).order_by(Ticket.id.desc())

    if mine or not is_agent(user):
        stmt = stmt.where(Ticket.requester_id == user.id)

    return list(session.scalars(stmt).all())

@router.get("/{ticket_id}", response_model=TicketOut)
def get_ticket(
    ticket_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    t = session.get(Ticket, ticket_id)
    if not t:
        raise HTTPException(status_code=404, detail="Not found")

    if (t.requester_id != user.id) and (user.role not in ("agent", "admin")):
        raise HTTPException(status_code=403, detail="Forbidden")

    return t
