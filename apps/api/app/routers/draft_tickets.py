from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.orm import Session

from ..db import get_session
from ..core.current_user import get_current_user
from ..core.tiptap import dump_tiptap, load_tiptap, is_empty_doc
from ..models.draft_ticket import DraftTicket
from ..models.project import Project
from ..models.project_member import ProjectMember
from ..models.ticket import Ticket
from ..models.user import User
from ..schemas.draft_ticket import DraftTicketIn, DraftTicketOut
from ..schemas.ticket import TicketOut
from .tickets import build_project_map, build_user_map, serialize_ticket

router = APIRouter(prefix="/draft-tickets", tags=["draft-tickets"])


def _normalize_str(value: str | None) -> str | None:
    if value is None:
        return None
    trimmed = value.strip()
    return trimmed or None


def _has_content(
    title: str | None,
    description: dict | None,
    priority: str | None,
    category: str | None,
    work_type: str | None,
    project_id: int | None,
) -> bool:
    if title and title.strip():
        return True
    if description and not is_empty_doc(description):
        return True
    if priority:
        return True
    if category:
        return True
    if work_type:
        return True
    if project_id is not None:
        return True
    return False


def _validate_project(session: Session, user: User, project_id: int | None, require_member: bool = True) -> None:
    if project_id is None:
        return
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다")
    if not require_member:
        return
    member_stmt = select(ProjectMember).where(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user.id,
    )
    if session.execute(member_stmt).first() is None:
        raise HTTPException(status_code=403, detail="접근 권한이 없습니다")


def _serialize_draft(d: DraftTicket, projects: dict[int, Project] | None = None) -> dict:
    project = projects.get(d.project_id) if projects and d.project_id else None
    return {
        "id": d.id,
        "title": d.title,
        "description": load_tiptap(d.description) if d.description else None,
        "priority": d.priority,
        "category": d.category,
        "work_type": d.work_type,
        "project_id": d.project_id,
        "project_name": project.name if project else None,
        "requester_id": d.requester_id,
        "created_at": d.created_at,
        "updated_at": d.updated_at,
    }


@router.get("", response_model=list[DraftTicketOut])
def list_drafts(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    stmt = select(DraftTicket).where(DraftTicket.requester_id == user.id).order_by(desc(DraftTicket.updated_at), desc(DraftTicket.id))
    drafts = list(session.scalars(stmt).all())
    project_ids = {d.project_id for d in drafts if d.project_id}
    projects = build_project_map(session, project_ids)
    return [_serialize_draft(d, projects) for d in drafts]


@router.post("", response_model=DraftTicketOut)
def create_draft(
    payload: DraftTicketIn,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    title = _normalize_str(payload.title)
    description = payload.description
    priority = _normalize_str(payload.priority)
    category = _normalize_str(payload.category)
    work_type = _normalize_str(payload.work_type)
    project_id = payload.project_id

    if not _has_content(title, description, priority, category, work_type, project_id):
        raise HTTPException(status_code=422, detail="임시저장 내용이 비어있습니다")

    _validate_project(session, user, project_id, require_member=False)

    d = DraftTicket(
        title=title,
        description=dump_tiptap(description) if description and not is_empty_doc(description) else None,
        priority=priority,
        category=category,
        work_type=work_type,
        project_id=project_id,
        requester_id=user.id,
        updated_at=datetime.utcnow(),
    )
    session.add(d)
    session.commit()
    session.refresh(d)
    project_ids = {d.project_id} if d.project_id else set()
    projects = build_project_map(session, project_ids)
    return _serialize_draft(d, projects)


@router.get("/{draft_id}", response_model=DraftTicketOut)
def get_draft(
    draft_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    d = session.get(DraftTicket, draft_id)
    if not d or d.requester_id != user.id:
        raise HTTPException(status_code=404, detail="임시저장을 찾을 수 없습니다")
    project_ids = {d.project_id} if d.project_id else set()
    projects = build_project_map(session, project_ids)
    return _serialize_draft(d, projects)


@router.patch("/{draft_id}", response_model=DraftTicketOut)
def update_draft(
    draft_id: int,
    payload: DraftTicketIn,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    d = session.get(DraftTicket, draft_id)
    if not d or d.requester_id != user.id:
        raise HTTPException(status_code=404, detail="임시저장을 찾을 수 없습니다")

    fields = payload.__fields_set__
    title = d.title
    priority = d.priority
    category = d.category
    work_type = d.work_type
    project_id = d.project_id
    description = d.description

    if "title" in fields:
        title = _normalize_str(payload.title)
    if "priority" in fields:
        priority = _normalize_str(payload.priority)
    if "category" in fields:
        category = _normalize_str(payload.category)
    if "work_type" in fields:
        work_type = _normalize_str(payload.work_type)
    if "project_id" in fields:
        project_id = payload.project_id
    if "description" in fields:
        description = dump_tiptap(payload.description) if payload.description and not is_empty_doc(payload.description) else None

    if not _has_content(title, load_tiptap(description) if description else None, priority, category, work_type, project_id):
        raise HTTPException(status_code=422, detail="임시저장 내용이 비어있습니다")

    _validate_project(session, user, project_id, require_member=False)

    d.title = title
    d.description = description
    d.priority = priority
    d.category = category
    d.work_type = work_type
    d.project_id = project_id
    d.updated_at = datetime.utcnow()
    session.commit()
    session.refresh(d)
    project_ids = {d.project_id} if d.project_id else set()
    projects = build_project_map(session, project_ids)
    return _serialize_draft(d, projects)


@router.delete("/{draft_id}")
def delete_draft(
    draft_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    d = session.get(DraftTicket, draft_id)
    if not d or d.requester_id != user.id:
        raise HTTPException(status_code=404, detail="임시저장을 찾을 수 없습니다")
    session.delete(d)
    session.commit()
    return {"ok": True}


@router.post("/{draft_id}/publish", response_model=TicketOut)
def publish_draft(
    draft_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    d = session.get(DraftTicket, draft_id)
    if not d or d.requester_id != user.id:
        raise HTTPException(status_code=404, detail="임시저장을 찾을 수 없습니다")

    title = _normalize_str(d.title)
    if not title:
        raise HTTPException(status_code=422, detail="제목을 입력해주세요")
    if not d.description or is_empty_doc(load_tiptap(d.description)):
        raise HTTPException(status_code=422, detail="설명을 입력해주세요")
    if not d.category:
        raise HTTPException(status_code=422, detail="카테고리를 선택해주세요")
    if not d.priority:
        raise HTTPException(status_code=422, detail="우선순위를 선택해주세요")

    _validate_project(session, user, d.project_id, require_member=True)

    t = Ticket(
        title=title,
        description=d.description,
        priority=d.priority,
        category=d.category,
        work_type=d.work_type,
        project_id=d.project_id,
        requester_id=user.id,
        updated_at=datetime.utcnow(),
    )
    session.add(t)
    session.flush()
    session.delete(d)
    session.commit()
    session.refresh(t)
    user_ids: set[int] = {t.requester_id}
    users = build_user_map(session, user_ids)
    project_ids: set[int] = {t.project_id} if t.project_id else set()
    projects = build_project_map(session, project_ids)
    return serialize_ticket(t, users, projects)
