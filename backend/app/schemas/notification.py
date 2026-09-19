from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel

from app.models.notification import NotificationType


class ActorPublic(BaseModel):
    user_id: UUID
    username: str
    display_name: str
    avatar_url: Optional[str] = None

    model_config = {
        "from_attributes": True,
    }


class NotificationResponse(BaseModel):
    id: UUID
    recipient_id: UUID
    actor_id: Optional[UUID] = None
    actor: Optional[ActorPublic] = None
    type: NotificationType
    title: str
    message: str
    reference_id: Optional[UUID] = None
    is_read: bool
    created_at: datetime

    model_config = {
        "from_attributes": True,
    }


class NotificationsListResponse(BaseModel):
    notifications: List[NotificationResponse]
    total: int
    limit: int
    offset: int


class UnreadCountResponse(BaseModel):
    count: int


class MarkAllReadResponse(BaseModel):
    marked_read: int
