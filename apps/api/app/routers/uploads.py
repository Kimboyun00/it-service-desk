from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from pydantic import BaseModel
from uuid import uuid4
from datetime import datetime
from app.core.current_user import get_current_user
from app.models.user import User
from app.core.object_storage import get_s3
from app.core.settings import settings
from fastapi.responses import FileResponse
from pathlib import Path
from tempfile import SpooledTemporaryFile
import anyio
import os

router = APIRouter(prefix="/uploads", tags=["uploads"])

UPLOAD_ROOT = Path("/data/uploads")
MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5MB
ALLOW_IMAGE_EXT = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"}

class PresignIn(BaseModel):
    filename: str
    content_type: str

class PresignOut(BaseModel):
    key: str
    url: str
    expires_in: int


class UploadImageOut(BaseModel):
    key: str
    url: str
    content_type: str
    size: int

@router.post("/presign", response_model=PresignOut)
def presign_put(payload: PresignIn, user: User = Depends(get_current_user)):
    # 파일 확장자 정도만 유지(보안상 filename 그대로 쓰지 않기)
    ext = ""
    if "." in payload.filename:
        ext = "." + payload.filename.split(".")[-1].lower()

    key = f"uploads/{user.id}/{datetime.utcnow().strftime('%Y/%m/%d')}/{uuid4().hex}{ext}"

    s3 = get_s3()
    expires = 60 * 10  # 10분
    try:
        url = s3.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": settings.OBJECT_STORAGE_BUCKET,
                "Key": key,
                "ContentType": payload.content_type,
            },
            ExpiresIn=expires,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"presign failed: {e}")

    return PresignOut(key=key, url=url, expires_in=expires)


@router.post("/images", response_model=UploadImageOut)
async def upload_image(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are allowed")

    filename = file.filename or "image.bin"
    _, ext = os.path.splitext(filename.lower())
    if ext and ext not in ALLOW_IMAGE_EXT:
        raise HTTPException(status_code=400, detail="Unsupported image type")

    spooled = SpooledTemporaryFile(max_size=2 * 1024 * 1024)
    size = 0
    while True:
        chunk = await file.read(1024 * 1024)
        if not chunk:
            break
        size += len(chunk)
        if size > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=413, detail="Image too large")
        spooled.write(chunk)
    spooled.seek(0)

    key = f"editor/{user.id}/{datetime.utcnow().strftime('%Y/%m/%d')}/{uuid4().hex}{ext or '.png'}"
    content_type = file.content_type or "application/octet-stream"

    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    target_path = UPLOAD_ROOT / key
    target_path.parent.mkdir(parents=True, exist_ok=True)

    def _write_file():
        spooled.seek(0)
        with open(target_path, "wb") as f:
            f.write(spooled.read())

    await anyio.to_thread.run_sync(_write_file)

    return UploadImageOut(
        key=key,
        url=f"/uploads/{key}",
        content_type=content_type,
        size=size,
    )


@router.get("/{key:path}")
def serve_upload(key: str):
    if ".." in key:
        raise HTTPException(status_code=400, detail="Invalid path")
    path = (UPLOAD_ROOT / key).resolve()
    if not str(path).startswith(str(UPLOAD_ROOT.resolve())):
        raise HTTPException(status_code=400, detail="Invalid path")
    if not path.exists():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(str(path))
