from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field

from app.schemas.activity import ActivityType


class ActivityHostPublic(BaseModel):
    id: UUID
    name: str
    username: str
    avatar_url: Optional[str] = None


class ActivityParticipantPublic(BaseModel):
    id: UUID
    name: str
    username: str
    avatar_url: Optional[str] = None
    joined_at: Optional[datetime] = None


class ActivitySessionResponse(BaseModel):
    id: UUID
    activity_id: UUID
    session_number: int
    title: Optional[str] = None
    scheduled_at: str
    duration_minutes: int
    state: str


class ActivityChatMessageResponse(BaseModel):
    id: UUID
    sender_id: UUID
    sender_name: str
    sender_avatar: Optional[str] = None
    text: str
    created_at: datetime


class PublicActivityResponse(BaseModel):
    id: UUID
    intent: ActivityType
    title: str
    description: str
    activity_type: str
    recurrence_type: Optional[str] = None
    frequency: Optional[str] = None
    day_of_week: Optional[str] = None
    schedule_day: Optional[str] = None
    time_of_day: Optional[str] = None
    schedule_time: Optional[str] = None
    timezone: Optional[str] = "IST (UTC+5:30)"
    duration_minutes: int = 60
    max_participants: int = 10
    participant_limit: Optional[int] = 10
    participant_count: int = 1
    status: str = "ACTIVE"
    host: ActivityHostPublic
    created_at: datetime
    public_participants: List[ActivityParticipantPublic] = []
    is_participant: bool = False
    is_host: bool = False


class ParticipantActivityResponse(PublicActivityResponse):
    meeting_platform: str = "Google Meet"
    meeting_url: str
    private_notes: Optional[str] = None
    upcoming_session: Optional[ActivitySessionResponse] = None
    past_sessions: List[ActivitySessionResponse] = []
    chat_messages: List[ActivityChatMessageResponse] = []


class CreateActivityRequest(BaseModel):
    intent: ActivityType
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=10)
    activity_type: str = "RECURRING"
    frequency: Optional[str] = "WEEKLY"
    day_of_week: Optional[str] = "Saturday"
    time_of_day: Optional[str] = "8:00 PM"
    timezone: Optional[str] = "IST (UTC+5:30)"
    duration_minutes: int = 60
    max_participants: int = 10
    meeting_platform: str = "Google Meet"
    meeting_url: str = Field(..., min_length=5)
    private_notes: Optional[str] = None


class UpdateActivityRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    meeting_platform: Optional[str] = None
    meeting_url: Optional[str] = None
    private_notes: Optional[str] = None
    max_participants: Optional[int] = None
    day_of_week: Optional[str] = None
    time_of_day: Optional[str] = None


class ActivityInviteRequest(BaseModel):
    connection_ids: List[UUID]
