from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from ..db import get_session
from ..models.knowledge_item import KnowledgeItem
from ..models.user import User
from ..models.attachment import Attachment
from ..core.current_user import get_current_user
from ..schemas.notice import NoticeCreateIn, NoticeUpdateIn, NoticeOut
from pathlib import Path
from ..core.tiptap import dump_tiptap, load_tiptap, is_empty_doc, extract_image_sources
from ..core.settings import settings
from ..core.storage import delete_object, extract_key_from_url


router = APIRouter(prefix="/notices", tags=["notices"])


def require_staff(user: User) -> None:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")


@router.get("", response_model=list[NoticeOut])
def list_notices(session: Session = Depends(get_session)):
    stmt = select(KnowledgeItem).where(KnowledgeItem.kind == "notice").order_by(desc(KnowledgeItem.id))
    notices = list(session.scalars(stmt).all())
    notice_ids = [n.id for n in notices]

    attachments_by_notice: dict[int, list[Attachment]] = {}
    if notice_ids:
        for att in session.scalars(
            select(Attachment).where(Attachment.notice_id.in_(notice_ids)).order_by(Attachment.id.asc())
        ).all():
            attachments_by_notice.setdefault(att.notice_id, []).append(att)

    return [
        {
            "id": n.id,
            "title": n.title,
            "body": load_tiptap(n.body),
            "author_emp_no": n.author_emp_no,
            "created_at": n.created_at,
            "updated_at": n.updated_at,
            "attachments": attachments_by_notice.get(n.id, []),
        }
        for n in notices
    ]


@router.get("/{notice_id}", response_model=NoticeOut)
def get_notice(notice_id: int, session: Session = Depends(get_session)):
    notice = session.get(KnowledgeItem, notice_id)
    if not notice or notice.kind != "notice":
        raise HTTPException(status_code=404, detail="Not found")
    attachments = list(
        session.scalars(select(Attachment).where(Attachment.notice_id == notice_id).order_by(Attachment.id.asc())).all()
    )
    return {
        "id": notice.id,
        "title": notice.title,
        "body": load_tiptap(notice.body),
        "author_emp_no": notice.author_emp_no,
        "created_at": notice.created_at,
        "updated_at": notice.updated_at,
        "attachments": attachments,
    }


@router.post("", response_model=NoticeOut)
def create_notice(
    payload: NoticeCreateIn,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    require_staff(user)
    if is_empty_doc(payload.body):
        raise HTTPException(status_code=422, detail="Body is required")
    notice = KnowledgeItem(title=payload.title, body=payload.body, author_emp_no=user.emp_no, kind="notice")
    notice.body = dump_tiptap(payload.body)
    session.add(notice)
    session.commit()
    session.refresh(notice)
    return {
        "id": notice.id,
        "title": notice.title,
        "body": load_tiptap(notice.body),
        "author_emp_no": notice.author_emp_no,
        "created_at": notice.created_at,
        "updated_at": notice.updated_at,
        "attachments": [],
    }


@router.patch("/{notice_id}", response_model=NoticeOut)
def update_notice(
    notice_id: int,
    payload: NoticeUpdateIn,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    require_staff(user)
    notice = session.get(KnowledgeItem, notice_id)
    if not notice or notice.kind != "notice":
        raise HTTPException(status_code=404, detail="Not found")

    if payload.title is not None:
        notice.title = payload.title
    if payload.body is not None:
        if is_empty_doc(payload.body):
            raise HTTPException(status_code=422, detail="Body is required")
        notice.body = dump_tiptap(payload.body)

    session.commit()
    session.refresh(notice)
    return {
        "id": notice.id,
        "title": notice.title,
        "body": load_tiptap(notice.body),
        "author_emp_no": notice.author_emp_no,
        "created_at": notice.created_at,
        "updated_at": notice.updated_at,
        "attachments": list(
            session.scalars(select(Attachment).where(Attachment.notice_id == notice_id).order_by(Attachment.id.asc())).all()
        ),
    }


@router.delete("/{notice_id}")
def delete_notice(
    notice_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    require_staff(user)
    notice = session.get(KnowledgeItem, notice_id)
    if not notice or notice.kind != "notice":
        raise HTTPException(status_code=404, detail="Not found")
    keys = set()
    for src in extract_image_sources(notice.body):
        key = extract_key_from_url(src)
        if key:
            keys.add(key)
    attachments = list(
        session.scalars(select(Attachment).where(Attachment.notice_id == notice_id)).all()
    )
    for att in attachments:
        keys.add(att.key)
    if keys:
        if settings.STORAGE_BACKEND == "object":
            for key in keys:
                delete_object(key=key)
        else:
            upload_root = Path(settings.LOCAL_UPLOAD_ROOT)
            for key in keys:
                path = upload_root / key
                if path.exists():
                    path.unlink()
    if attachments:
        for att in attachments:
            session.delete(att)
    session.delete(notice)
    session.commit()
    return {"ok": True}
