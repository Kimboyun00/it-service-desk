from pydantic import BaseModel, Field

class CommentCreateIn(BaseModel):
    body: str = Field(min_length=1)
    is_internal: bool = False

class CommentOut(BaseModel):
    id: int
    ticket_id: int
    author_id: int
    body: str
    is_internal: bool

    class Config:
        from_attributes = True
