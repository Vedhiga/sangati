from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field, field_validator

from app.schemas.activity import ActivityType


class AuthorPublic(BaseModel):
    user_id: UUID
    username: str
    display_name: str
    avatar_url: Optional[str] = None

    model_config = {
        "from_attributes": True,
    }


class PostCreate(BaseModel):
    activity_type: ActivityType = Field(
        ...,
        description="Contextual activity: BUILD, LEARN, CONVERSATION, or EXPLORE.",
    )
    content: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="Content of the post, up to 1000 characters.",
    )
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    link_url: Optional[str] = None
    link_title: Optional[str] = None
    link_description: Optional[str] = None
    link_image: Optional[str] = None

    @field_validator("content")
    @classmethod
    def validate_content_not_blank(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Post content cannot be empty or whitespace only.")
        return trimmed


class PostUpdate(BaseModel):
    content: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="Updated post content, up to 1000 characters.",
    )
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    link_url: Optional[str] = None
    link_title: Optional[str] = None
    link_description: Optional[str] = None
    link_image: Optional[str] = None

    @field_validator("content")
    @classmethod
    def validate_content_not_blank(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Post content cannot be empty or whitespace only.")
        return trimmed


class PostResponse(BaseModel):
    id: UUID
    author_id: UUID
    activity_type: ActivityType
    content: str
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    link_url: Optional[str] = None
    link_title: Optional[str] = None
    link_description: Optional[str] = None
    link_image: Optional[str] = None
    author: AuthorPublic
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True,
    }


class PostsListResponse(BaseModel):
    posts: List[PostResponse]
    total: int
    limit: int
    offset: int
