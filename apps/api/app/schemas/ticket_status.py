from pydantic import BaseModel, Field

ALLOWED_STATUS = {"open", "in_progress", "resolved", "closed"}

class TicketStatusUpdateIn(BaseModel):
    status: str = Field(...)

    def validate_status(self):
        if self.status not in ALLOWED_STATUS:
            raise ValueError(f"Invalid status: {self.status}")
        return self
