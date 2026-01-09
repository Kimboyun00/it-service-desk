from pydantic import BaseModel, Field
from datetime import datetime
from .user import UserSummaryOut

class CommentCreateIn(BaseModel):
    body: str = Field(min_length=1)
    is_internal: bool = False

class CommentOut(BaseModel):
    id: int
    ticket_id: int
    author_id: int
    author: UserSummaryOut | None = None
    body: str
    is_internal: bool
    created_at: datetime | None = None

    class Config:
        from_attributes = True
