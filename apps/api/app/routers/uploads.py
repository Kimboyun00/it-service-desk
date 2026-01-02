from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from uuid import uuid4
from datetime import datetime
from app.core.current_user import get_current_user
from app.models.user import User
from app.core.object_storage import get_s3
from app.core.settings import settings

router = APIRouter(prefix="/uploads", tags=["uploads"])

class PresignIn(BaseModel):
    filename: str
    content_type: str

class PresignOut(BaseModel):
    key: str
    url: str
    expires_in: int

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
