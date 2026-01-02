from pydantic import BaseModel
from typing import List

from .ticket import TicketOut
from .comment import CommentOut
from .event import EventOut

class TicketDetailOut(BaseModel):
    ticket: TicketOut
    comments: List[CommentOut]
    events: List[EventOut]
