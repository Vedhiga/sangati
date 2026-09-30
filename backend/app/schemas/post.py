from datetime import datetime
from typing import Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, Field, field_validator, model_validator

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
    content: Optional[str] = Field(
        "",
        max_length=1000,
        description="Content of the post, up to 1000 characters.",
    )
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    link_url: Optional[str] = None
    link_title: Optional[str] = None
    link_description: Optional[str] = None
    link_image: Optional[str] = None

    @model_validator(mode="after")
    def validate_content_or_media(self) -> "PostCreate":
        has_content = bool(self.content and self.content.strip())
        has_media = bool(self.media_url and self.media_url.strip())
        has_link = bool(self.link_url and self.link_url.strip())

        if not (has_content or has_media or has_link):
            raise ValueError("Post must contain text content, attached media, or a link.")
        if self.content:
            self.content = self.content.strip()
        else:
            self.content = ""
        return self


class PostUpdate(BaseModel):
    content: Optional[str] = Field(
        "",
        max_length=1000,
        description="Updated post content, up to 1000 characters.",
    )
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    link_url: Optional[str] = None
    link_title: Optional[str] = None
    link_description: Optional[str] = None
    link_image: Optional[str] = None

    @model_validator(mode="after")
    def validate_content_or_media(self) -> "PostUpdate":
        if self.content:
            self.content = self.content.strip()
        return self


class CommentCreate(BaseModel):
    content: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="Comment text up to 1000 characters.",
    )

    @field_validator("content")
    @classmethod
    def validate_content_not_blank(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Comment content cannot be empty or whitespace only.")
        return trimmed


class CommentUpdate(BaseModel):
    content: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="Updated comment text up to 1000 characters.",
    )

    @field_validator("content")
    @classmethod
    def validate_content_not_blank(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Comment content cannot be empty or whitespace only.")
        return trimmed


class CommentResponse(BaseModel):
    id: UUID
    post_id: UUID
    author_id: UUID
    content: str
    author: AuthorPublic
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True,
    }


class CommentsListResponse(BaseModel):
    comments: List[CommentResponse]
    total: int


class ReactionToggleRequest(BaseModel):
    reaction_type: str = Field(..., description="Reaction type e.g. LOVE, INTERESTING, CURIOUS, SUPPORT, CONNECT")


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
    likes_count: int = 0
    is_liked_by_user: bool = False
    user_reaction: Optional[str] = None
    user_reactions: List[str] = Field(default_factory=list)
    reactions_summary: Dict[str, int] = Field(default_factory=dict)
    comments_count: int = 0
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
