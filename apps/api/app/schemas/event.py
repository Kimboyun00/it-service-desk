from pydantic import BaseModel

class EventOut(BaseModel):
    id: int
    ticket_id: int
    actor_id: int
    type: str
    from_value: str | None
    to_value: str | None
    note: str | None

    class Config:
        from_attributes = True
