from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from ..db import get_session
from ..models.knowledge_item import KnowledgeItem
from ..models.ticket_category import TicketCategory
from ..models.user import User
from ..core.current_user import get_current_user
from ..schemas.faq import FaqCreateIn, FaqUpdateIn, FaqOut
from ..core.tiptap import dump_tiptap, load_tiptap, is_empty_doc


router = APIRouter(prefix="/faqs", tags=["faqs"])


def require_staff(user: User) -> None:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="접근 권한이 없습니다")


def row_to_out(faq: KnowledgeItem, category_name: str | None, category_code: str | None) -> FaqOut:
    return FaqOut(
        id=faq.id,
        question=faq.title,
        answer=load_tiptap(faq.body),
        category_id=faq.category_id,
        category_name=category_name,
        category_code=category_code,
        author_id=faq.author_id,
        created_at=faq.created_at,
        updated_at=faq.updated_at,
    )


@router.get("", response_model=list[FaqOut])
def list_faqs(
    session: Session = Depends(get_session),
    category_id: int | None = Query(default=None),
):
    stmt = (
        select(
            KnowledgeItem,
            TicketCategory.name.label("category_name"),
            TicketCategory.code.label("category_code"),
        )
        .outerjoin(TicketCategory, KnowledgeItem.category_id == TicketCategory.id)
        .where(KnowledgeItem.kind == "faq")
        .order_by(desc(KnowledgeItem.id))
    )
    if category_id is not None:
        stmt = stmt.where(KnowledgeItem.category_id == category_id)
    rows = session.execute(stmt).all()
    return [row_to_out(*row) for row in rows]


@router.get("/{faq_id}", response_model=FaqOut)
def get_faq(faq_id: int, session: Session = Depends(get_session)):
    stmt = (
        select(
            KnowledgeItem,
            TicketCategory.name.label("category_name"),
            TicketCategory.code.label("category_code"),
        )
        .outerjoin(TicketCategory, KnowledgeItem.category_id == TicketCategory.id)
        .where(KnowledgeItem.id == faq_id)
        .where(KnowledgeItem.kind == "faq")
    )
    row = session.execute(stmt).first()
    if not row:
        raise HTTPException(status_code=404, detail="FAQ를 찾을 수 없습니다")
    return row_to_out(*row)


@router.post("", response_model=FaqOut)
def create_faq(
    payload: FaqCreateIn,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    require_staff(user)
    if is_empty_doc(payload.answer):
        raise HTTPException(status_code=422, detail="Answer is required")
    if payload.category_id is not None:
        cat = session.get(TicketCategory, payload.category_id)
        if not cat:
            raise HTTPException(status_code=404, detail="카테고리를 찾을 수 없습니다")

    faq = KnowledgeItem(
        kind="faq",
        title=payload.question,
        body=dump_tiptap(payload.answer),
        category_id=payload.category_id,
        author_id=user.id,
    )
    session.add(faq)
    session.commit()
    return get_faq(faq.id, session)


@router.patch("/{faq_id}", response_model=FaqOut)
def update_faq(
    faq_id: int,
    payload: FaqUpdateIn,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    require_staff(user)
    faq = session.get(KnowledgeItem, faq_id)
    if not faq or faq.kind != "faq":
        raise HTTPException(status_code=404, detail="FAQ를 찾을 수 없습니다")

    if payload.category_id is not None:
        cat = session.get(TicketCategory, payload.category_id)
        if not cat:
            raise HTTPException(status_code=404, detail="카테고리를 찾을 수 없습니다")
        faq.category_id = payload.category_id

    if payload.question is not None:
        faq.title = payload.question
    if payload.answer is not None:
        if is_empty_doc(payload.answer):
            raise HTTPException(status_code=422, detail="답변을 입력해주세요")
        faq.body = dump_tiptap(payload.answer)

    session.commit()
    return get_faq(faq.id, session)


@router.delete("/{faq_id}")
def delete_faq(
    faq_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    require_staff(user)
    faq = session.get(KnowledgeItem, faq_id)
    if not faq or faq.kind != "faq":
        raise HTTPException(status_code=404, detail="FAQ를 찾을 수 없습니다")
    session.delete(faq)
    session.commit()
    return {"ok": True}
