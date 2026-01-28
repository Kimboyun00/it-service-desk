from sqlalchemy.orm import Session
from sqlalchemy import select

from ..models.ticket_category import TicketCategory
from ..models.ticket import Ticket


def seed_ticket_categories(session: Session) -> None:
    removed_codes = {"cloud", "network_server", "security", "device_mgmt"}

    seeds = [
        dict(code="mis_academic", name="MIS(학사)", description="MIS(학사)", sort_order=10),
        dict(code="mis_admin", name="MIS(일반행정)", description="MIS(일반행정)", sort_order=20),
        dict(code="portal", name="포탈", description="포탈", sort_order=30),
        dict(code="dooray", name="두레이", description="두레이", sort_order=40),
        dict(code="vdi_gabia_daas", name="VDI(Gabia DaaS)", description="VDI(Gabia DaaS)", sort_order=50),
        dict(code="it_service", name="IT 서비스", description="IT 서비스", sort_order=60),
        dict(code="infra", name="인프라", description="인프라", sort_order=70),
        dict(code="etc", name="기타", description="기타", sort_order=80),
    ]
    seed_codes = {s["code"] for s in seeds}

    for s in seeds:
        exists = session.scalar(select(TicketCategory).where(TicketCategory.code == s["code"]))
        if exists:
            exists.name = s["name"]
            exists.description = s["description"]
            exists.sort_order = s["sort_order"]
        else:
            cat = TicketCategory(
                code=s["code"],
                name=s["name"],
                description=s["description"],
                sort_order=s["sort_order"],
            )
            session.add(cat)

    if removed_codes:
        etc_category = session.scalar(select(TicketCategory).where(TicketCategory.code == "etc"))
        if etc_category:
            removed_categories = session.scalars(
                select(TicketCategory).where(TicketCategory.code.in_(removed_codes))
            ).all()
            removed_ids = [c.id for c in removed_categories]
            if removed_ids:
                session.query(Ticket).filter(Ticket.category_id.in_(removed_ids)).update(
                    {Ticket.category_id: etc_category.id}, synchronize_session=False
                )

    extra_categories = session.scalars(
        select(TicketCategory).where(TicketCategory.code.notin_(seed_codes))
    ).all()
    for cat in extra_categories:
        in_use = session.scalar(select(Ticket).where(Ticket.category_id == cat.id))
        if in_use:
            continue
        session.delete(cat)

    session.commit()
