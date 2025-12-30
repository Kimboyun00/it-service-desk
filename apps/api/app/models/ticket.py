from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, func
from .user import Base

class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)

    status: Mapped[str] = mapped_column(String(32), default="open")  # open/in_progress/waiting/resolved/closed
    priority: Mapped[str] = mapped_column(String(16), default="medium")  # low/medium/high/critical
    category: Mapped[str] = mapped_column(String(64), default="general")

    requester_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    assignee_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
