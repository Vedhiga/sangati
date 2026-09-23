from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field, field_validator

from app.schemas.connection import ConnectionUserPublic


class MessageCreate(BaseModel):
    content: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="Message content, up to 2000 characters.",
    )

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Message content cannot be empty or whitespace only.")
        return trimmed


class MessageResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    sender_id: UUID
    sender: Optional[ConnectionUserPublic] = None
    content: str
    created_at: datetime

    model_config = {
        "from_attributes": True,
    }


class MessagesListResponse(BaseModel):
    messages: List[MessageResponse]
    total: int
    limit: int
    offset: int


class MessagePreview(BaseModel):
    id: UUID
    sender_id: UUID
    content: str
    created_at: datetime


class GroupConversationCreate(BaseModel):
    participant_user_ids: List[UUID] = Field(
        ...,
        min_length=1,
        max_length=20,
        description="List of target user IDs to include in the conversation. Must be connected users.",
    )
    title: Optional[str] = Field(
        None,
        max_length=100,
        description="Optional title for the group conversation.",
    )


class ConversationItemResponse(BaseModel):
    id: UUID
    title: Optional[str] = None
    is_group: bool = False
    conversation_type: Optional[str] = "DIRECT"
    activity_id: Optional[UUID] = None
    status: Optional[str] = "ACTIVE"
    other_user: Optional[ConnectionUserPublic] = None
    participants: List[ConnectionUserPublic] = Field(default_factory=list)
    last_message: Optional[MessagePreview] = None
    created_at: datetime
    last_message_at: Optional[datetime] = None


class ConversationsListResponse(BaseModel):
    conversations: List[ConversationItemResponse]
    total: int


class ConversationDetailResponse(BaseModel):
    id: UUID
    title: Optional[str] = None
    is_group: bool = False
    conversation_type: Optional[str] = "DIRECT"
    activity_id: Optional[UUID] = None
    status: Optional[str] = "ACTIVE"
    other_user: Optional[ConnectionUserPublic] = None
    participants: List[ConnectionUserPublic] = Field(default_factory=list)
    created_at: datetime
    last_message_at: Optional[datetime] = None
