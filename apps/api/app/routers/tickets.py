from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..db import get_session
from ..models.ticket import Ticket
from ..schemas.ticket import TicketCreateIn, TicketOut
from ..core.current_user import get_current_user
from ..models.user import User
from ..models.event import TicketEvent
from ..schemas.ticket_status import ALLOWED_STATUS
from ..schemas.event import EventOut

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

def is_staff(user: User) -> bool:
    return user.role in ("agent", "admin")

@router.patch("/{ticket_id}/status")
def update_status(
    ticket_id: int,
    payload: dict,  # 일단 간단하게, 다음에 스키마로 고도화 가능
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    if not is_staff(user):
        raise HTTPException(status_code=403, detail="Forbidden")

    ticket = session.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    new_status = payload.get("status")
    if new_status not in ALLOWED_STATUS:
        raise HTTPException(status_code=422, detail=f"Invalid status: {new_status}")

    old_status = ticket.status
    if old_status == new_status:
        return {"ok": True, "status": ticket.status}

    ticket.status = new_status

    ev = TicketEvent(
        ticket_id=ticket_id,
        actor_id=user.id,
        type="status_changed",
        from_value=old_status,
        to_value=new_status,
    )
    session.add(ev)
    session.commit()

    return {"ok": True, "from": old_status, "to": new_status}

@router.get("/{ticket_id}/events", response_model=list[EventOut])
def list_events(
    ticket_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    ticket = session.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if not is_staff(user) and ticket.requester_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    stmt = select(TicketEvent).where(TicketEvent.ticket_id == ticket_id).order_by(TicketEvent.id.asc())
    return list(session.scalars(stmt).all())