from pydantic import BaseModel, Field
from datetime import datetime


class ReopenCreateIn(BaseModel):
    description: dict = Field(...)


class ReopenOut(BaseModel):
    id: int
    ticket_id: int
    description: dict
    requester_emp_no: str
    created_at: datetime

    class Config:
        from_attributes = True
