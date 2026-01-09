from pydantic import BaseModel
from datetime import datetime


class NotificationOut(BaseModel):
    id: str
    ticket_id: int | None = None
    ticket_title: str | None = None
    type: str
    message: str
    created_at: datetime
