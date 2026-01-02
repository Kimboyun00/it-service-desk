from fastapi import APIRouter, Depends
from app.core.current_user import get_current_user
from app.models.user import User

router = APIRouter(tags=["me"])

@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return {"id": user.id, "email": user.email, "role": user.role}
