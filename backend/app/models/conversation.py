import uuid
from sqlalchemy import Column, DateTime, ForeignKey, Index, Text, UniqueConstraint, String, Boolean
from sqlalchemy.sql import func

from app.db.base import Base
from app.models.profile import GUID


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    title = Column(String(100), nullable=True)
    is_group = Column(Boolean, default=False, nullable=False)
    conversation_type = Column(String(20), default="DIRECT", nullable=False, index=True)
    activity_id = Column(GUID, ForeignKey("activities.id", ondelete="SET NULL"), nullable=True, index=True)
    status = Column(String(20), default="ACTIVE", nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    last_message_at = Column(DateTime(timezone=True), nullable=True, index=True)

    def __repr__(self) -> str:
        return f"<Conversation id={self.id} title={self.title} type={self.conversation_type} activity={self.activity_id}>"


class ConversationParticipant(Base):
    __tablename__ = "conversation_participants"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    conversation_id = Column(GUID, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(GUID, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("conversation_id", "user_id", name="uq_conversation_participant"),
    )

    def __repr__(self) -> str:
        return f"<ConversationParticipant convo={self.conversation_id} user={self.user_id}>"


class Message(Base):
    __tablename__ = "messages"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    conversation_id = Column(GUID, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(GUID, nullable=False, index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    __table_args__ = (
        Index("ix_messages_conversation_created", "conversation_id", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<Message id={self.id} convo={self.conversation_id} sender={self.sender_id}>"
