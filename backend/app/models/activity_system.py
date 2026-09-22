import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, String, Text, Integer, DateTime, UniqueConstraint, Index, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.profile import GUID


class ActivityStatus(str, Enum):
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    ENDED = "ENDED"


class ParticipantStatus(str, Enum):
    JOINED = "JOINED"
    LEFT = "LEFT"


class SessionStatus(str, Enum):
    UPCOMING = "UPCOMING"
    LIVE = "LIVE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class InvitationStatus(str, Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"


class Activity(Base):
    __tablename__ = "activities"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    host_user_id = Column(GUID, nullable=False, index=True)
    intent_type = Column(String(20), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)

    activity_type = Column(String(20), nullable=False, default="RECURRING")
    frequency = Column(String(50), nullable=True)
    day_of_week = Column(String(50), nullable=True)
    time_of_day = Column(String(50), nullable=True)
    timezone = Column(String(50), nullable=True, default="IST (UTC+5:30)")
    duration_minutes = Column(Integer, nullable=False, default=60)
    max_participants = Column(Integer, nullable=False, default=10)

    meeting_platform = Column(String(50), nullable=False, default="Google Meet")
    meeting_url = Column(String(512), nullable=False)
    private_notes = Column(Text, nullable=True)

    status = Column(String(20), nullable=False, default=ActivityStatus.ACTIVE.value, index=True)
    conversation_id = Column(GUID, ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), server_default=func.now(), nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_activities_intent_status", "intent_type", "status"),
        Index("ix_activities_host_status", "host_user_id", "status"),
    )

    def __repr__(self) -> str:
        return f"<Activity id={self.id} title={self.title} host={self.host_user_id} status={self.status}>"


class ActivityParticipant(Base):
    __tablename__ = "activity_participants"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    activity_id = Column(GUID, ForeignKey("activities.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(GUID, nullable=False, index=True)
    status = Column(String(20), nullable=False, default=ParticipantStatus.JOINED.value, index=True)
    joined_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now(), nullable=False)
    left_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("activity_id", "user_id", name="uq_activity_participant"),
        Index("ix_activity_participants_activity_user", "activity_id", "user_id"),
    )

    def __repr__(self) -> str:
        return f"<ActivityParticipant activity={self.activity_id} user={self.user_id} status={self.status}>"


class ActivitySession(Base):
    __tablename__ = "activity_sessions"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    activity_id = Column(GUID, ForeignKey("activities.id", ondelete="CASCADE"), nullable=False, index=True)
    session_number = Column(Integer, nullable=False, default=1)
    title = Column(String(255), nullable=True)
    scheduled_at = Column(String(100), nullable=False)
    duration_minutes = Column(Integer, nullable=False, default=60)
    status = Column(String(20), nullable=False, default=SessionStatus.UPCOMING.value, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now(), nullable=False)

    def __repr__(self) -> str:
        return f"<ActivitySession id={self.id} activity={self.activity_id} status={self.status}>"


class ActivityInvitation(Base):
    __tablename__ = "activity_invitations"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    activity_id = Column(GUID, ForeignKey("activities.id", ondelete="CASCADE"), nullable=False, index=True)
    invited_user_id = Column(GUID, nullable=False, index=True)
    invited_by_user_id = Column(GUID, nullable=False, index=True)
    status = Column(String(20), nullable=False, default=InvitationStatus.PENDING.value, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("activity_id", "invited_user_id", name="uq_activity_invitation"),
    )

    def __repr__(self) -> str:
        return f"<ActivityInvitation activity={self.activity_id} invited={self.invited_user_id}>"
