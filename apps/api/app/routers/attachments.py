from __future__ import annotations

from datetime import datetime
import os
from tempfile import SpooledTemporaryFile
from uuid import uuid4

import anyio
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from sqlalchemy.orm import Session
from pathlib import Path
from fastapi.responses import FileResponse


from app.core.current_user import get_current_user
from app.core.object_storage import get_s3
from app.core.settings import settings
from app.db import get_session
from app.models.attachment import Attachment
from app.models.event import TicketEvent
from app.models.ticket import Ticket
from app.models.user import User
from app.schemas.attachment import AttachmentOut

# NOTE:
# - 업로드는 CORS/브라우저 제약을 피하려고 **백엔드 멀티파트 업로드**로 제공
#   => POST /tickets/{ticket_id}/attachments/upload
# - 다운로드/삭제는 리소스 기준으로 제공
#   => GET /attachments/{attachment_id}/download-url
#   => DELETE /attachments/{attachment_id}

UPLOAD_ROOT = Path("/data/uploads")
router = APIRouter(tags=["attachments"])

MAX_BYTES = 25 * 1024 * 1024  # 25MB
DENY_EXT = {".exe", ".bat", ".cmd", ".ps1", ".sh", ".js"}


def is_staff(user: User) -> bool:
    return user.role == "admin"


def assert_ticket_access(user: User, ticket: Ticket) -> None:
    if is_staff(user):
        return
    if ticket.requester_id != user.id:
        raise HTTPException(status_code=403, detail="접근 권한이 없습니다")


@router.post("/tickets/{ticket_id}/attachments/upload", response_model=AttachmentOut)
async def upload_attachment(
    ticket_id: int,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """백엔드로 파일을 직접 업로드하고, Attachment row + 이벤트 로그를 생성한다."""

    # 1) 티켓 로드 + 접근권한 체크
    ticket = session.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="티켓을 찾을 수 없습니다")
    assert_ticket_access(user, ticket)

    # 2) 파일명/확장자 기본 검증
    filename = file.filename or "upload.bin"
    _, ext = os.path.splitext(filename.lower())
    if ext in DENY_EXT:
        raise HTTPException(status_code=400, detail="허용되지 않는 파일 형식입니다")

    # 3) 용량 제한 + 임시파일(spool)
    spooled = SpooledTemporaryFile(max_size=5 * 1024 * 1024)  # 5MB 넘어가면 디스크로 스풀
    size = 0
    while True:
        chunk = await file.read(1024 * 1024)  # 1MB
        if not chunk:
            break
        size += len(chunk)
        if size > MAX_BYTES:
            raise HTTPException(status_code=413, detail="파일 크기가 너무 큽니다")
        spooled.write(chunk)
    spooled.seek(0)

    # 4) 오브젝트 키 생성
    key = f"uploads/{user.id}/{datetime.utcnow().strftime('%Y/%m/%d')}/{uuid4().hex}{ext}"
    content_type = file.content_type or "application/octet-stream"

    # 5) Object Storage 업로드 (boto3 sync => thread)
    # 로컬 디스크 저장
    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)

    # key는 DB에 저장될 "상대키"로 사용 (예: uploads/123/2026/01/05/abcd.png)
    # 지금 코드에서 key 변수를 그대로 쓰고 있다면, 앞의 "uploads/"를 유지해도 됨.
    target_path = UPLOAD_ROOT / key.replace("uploads/", "", 1)
    target_path.parent.mkdir(parents=True, exist_ok=True)

    # spooled 내용을 파일로 저장
    def _write_file():
        spooled.seek(0)
        with open(target_path, "wb") as f:
            f.write(spooled.read())

    await anyio.to_thread.run_sync(_write_file)


    # ===== DB: Attachment 레코드 생성 =====
    att = Attachment(
        key=key,
        filename=filename,
        content_type=content_type,
        size=size,
        ticket_id=ticket_id,
        comment_id=None,
        is_internal=False,
        uploaded_by=user.id,
    )
    session.add(att)

    session.commit()
    session.refresh(att)
    return att




@router.get("/attachments/{attachment_id}/download-url")
def get_download_url(
    attachment_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    # 기존 권한 체크 로직은 그대로 유지하고…
    att = session.get(Attachment, attachment_id)
    if not att:
        raise HTTPException(status_code=404, detail="첨부파일을 찾을 수 없습니다")

    ticket = session.get(Ticket, att.ticket_id) if att.ticket_id else None
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if not is_staff(user):
        if ticket.requester_id != user.id:
            raise HTTPException(status_code=403, detail="접근 권한이 없습니다")
        if att.is_internal:
            raise HTTPException(status_code=403, detail="접근 권한이 없습니다")

    # presign 대신 서버 다운로드 엔드포인트를 넘겨줌
    return {"url": f"/attachments/{attachment_id}/download", "expires_in": 0}



@router.delete("/attachments/{attachment_id}")
def delete_attachment(
    attachment_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    if not is_staff(user):
        raise HTTPException(status_code=403, detail="접근 권한이 없습니다")

    att = session.get(Attachment, attachment_id)
    if not att:
        raise HTTPException(status_code=404, detail="첨부파일을 찾을 수 없습니다")

    if att.ticket_id is None:
        raise HTTPException(status_code=400, detail="티켓에 연결되지 않은 첨부파일입니다")

    # Object Storage에서 파일 삭제
    s3 = get_s3()
    try:
        s3.delete_object(Bucket=settings.OBJECT_STORAGE_BUCKET, Key=att.key)
    except Exception:
        raise HTTPException(status_code=500, detail="파일 삭제에 실패했습니다")

    session.delete(att)
    session.commit()

    return {"ok": True, "deleted_attachment_id": attachment_id}

@router.get("/attachments/{attachment_id}/download")
def download_attachment(
    attachment_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    att = session.get(Attachment, attachment_id)
    if not att:
        raise HTTPException(status_code=404, detail="첨부파일을 찾을 수 없습니다")

    if att.ticket_id is None:
        raise HTTPException(status_code=400, detail="티켓에 연결되지 않은 첨부파일입니다")

    ticket = session.get(Ticket, att.ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="티켓을 찾을 수 없습니다")

    # 권한 체크 (기존 download-url과 동일)
    if not is_staff(user):
        if ticket.requester_id != user.id:
            raise HTTPException(status_code=403, detail="접근 권한이 없습니다")
        if att.is_internal:
            raise HTTPException(status_code=403, detail="접근 권한이 없습니다")

    # 파일 경로 계산 (upload에서 했던 규칙과 동일해야 함)
    # DB key가 "uploads/..." 형태면 uploads/만 제거해서 /data/uploads 아래로 매핑
    rel = att.key.replace("uploads/", "", 1)
    path = UPLOAD_ROOT / rel

    if not path.exists():
        raise HTTPException(status_code=404, detail="서버에서 파일을 찾을 수 없습니다")

    return FileResponse(
        path=str(path),
        media_type=att.content_type or "application/octet-stream",
        filename=att.filename,
    )

