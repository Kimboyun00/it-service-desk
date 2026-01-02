from pydantic import BaseModel, Field
from typing import Optional

ALLOWED_STATUS = {"open", "in_progress", "resolved", "closed"}

class TicketStatusUpdateIn(BaseModel):
    status: str = Field(...)
    note: Optional[str] = None

    def validate_status(self):
        if self.status not in ALLOWED_STATUS:
            raise ValueError(f"Invalid status: {self.status}")
        return self
