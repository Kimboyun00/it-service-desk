from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import Integer, Text, Boolean, DateTime, ForeignKey, func
from .user import Base

class TicketComment(Base):
    __tablename__ = "ticket_comments"

    id: Mapped[int] = mapped_column(primary_key=True)

    ticket_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("tickets.id", ondelete="CASCADE")
    )
    author_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id")
    )

    body: Mapped[str] = mapped_column(Text)
    is_internal: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
