import uuid
from enum import Enum
from sqlalchemy import Column, String, Text, Boolean, DateTime, Index
from sqlalchemy.sql import func

from app.db.base import Base
from app.models.profile import GUID


class NotificationType(str, Enum):
    CONNECTION_REQUEST = "CONNECTION_REQUEST"
    CONNECTION_ACCEPTED = "CONNECTION_ACCEPTED"
    NEW_MESSAGE = "NEW_MESSAGE"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    recipient_id = Column(GUID, nullable=False, index=True)
    actor_id = Column(GUID, nullable=True, index=True)
    type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    reference_id = Column(GUID, nullable=True)
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_notifications_recipient_created", "recipient_id", "created_at"),
        Index("ix_notifications_recipient_is_read", "recipient_id", "is_read"),
    )

    def __repr__(self) -> str:
        return f"<Notification id={self.id} recipient={self.recipient_id} type={self.type} is_read={self.is_read}>"
