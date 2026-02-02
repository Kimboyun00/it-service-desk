from pydantic import BaseModel
from typing import List

from .ticket import TicketOut
from .comment import CommentOut
from .event import EventOut
from .attachment import AttachmentOut
from .reopen import ReopenOut


class TicketDetailOut(BaseModel):
    ticket: TicketOut
    comments: list[CommentOut]
    events: list[EventOut]
    attachments: list[AttachmentOut]
    reopens: list[ReopenOut] = []