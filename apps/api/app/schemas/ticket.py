from pydantic import BaseModel, Field

class TicketCreateIn(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=1)
    priority: str = Field(default="medium")
    category: str = Field(default="general")

class TicketOut(BaseModel):
    id: int
    title: str
    description: str
    status: str
    priority: str
    category: str
    requester_id: int
    assignee_id: int | None

    class Config:
        from_attributes = True
