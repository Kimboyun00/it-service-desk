from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..schemas.auth import RegisterIn, LoginIn, TokenOut
from ..core.config import settings
from ..core.security import verify_password, create_access_token
from ..models.user import User
from ..db import get_session

router = APIRouter(prefix="/auth", tags=["auth"])

def _email_domain_ok(email: str) -> bool:
    if not settings.allowed_email_domains:
        return True
    domain = email.split("@")[-1].lower()
    return domain in settings.allowed_email_domains

@router.post("/register")
def register(payload: RegisterIn, session: Session = Depends(get_session)):
    raise HTTPException(status_code=403, detail="Registration is disabled.")

@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, session: Session = Depends(get_session)):
    user = session.scalar(select(User).where(User.email == payload.email))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials.")
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Email not verified.")
    return TokenOut(access_token=create_access_token(str(user.id)))
