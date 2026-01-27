from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..db import get_session
from ..core.current_user import get_current_user
from ..models.project import Project
from ..models.project_member import ProjectMember
from ..models.user import User
from ..schemas.project import ProjectCreateIn, ProjectOut
from pydantic import BaseModel

router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectReorderIn(BaseModel):
    project_ids: list[int]


@router.get("", response_model=list[ProjectOut])
def list_projects(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
    query: str | None = Query(default=None),
    mine: bool = Query(default=True),
):
    stmt = select(Project)
    if mine:
        stmt = stmt.join(ProjectMember, ProjectMember.project_id == Project.id).where(
            ProjectMember.user_emp_no == user.emp_no
        )
    if query:
        stmt = stmt.where(Project.name.ilike(f"%{query.strip()}%"))
    # 프로젝트는 정렬 순서와 생성 순서 기준으로 노출
    stmt = stmt.order_by(Project.sort_order.asc(), Project.id.asc())
    return list(session.scalars(stmt).all())


@router.post("", response_model=ProjectOut)
def create_project(
    payload: ProjectCreateIn,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")

    if payload.start_date and payload.end_date and payload.start_date > payload.end_date:
        raise HTTPException(status_code=422, detail="Invalid project period")

    project = Project(
        name=payload.name.strip(),
        start_date=payload.start_date,
        end_date=payload.end_date,
        created_by_emp_no=user.emp_no,
    )
    session.add(project)
    session.commit()
    session.refresh(project)

    return project


@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.name == "없음":
        raise HTTPException(status_code=409, detail="Protected project cannot be deleted")
    session.query(ProjectMember).filter(ProjectMember.project_id == project_id).delete()
    session.delete(project)
    session.commit()
    return {"ok": True}


@router.post("/reorder")
def reorder_projects(
    payload: ProjectReorderIn,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")

    # 전달된 ID 순서대로 sort_order 갱신
    for index, project_id in enumerate(payload.project_ids):
        project = session.get(Project, project_id)
        if not project:
            continue
        project.sort_order = index + 1

    session.commit()
    return {"ok": True}

