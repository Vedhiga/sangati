import re
from datetime import datetime
from typing import Optional, List, Any
import json
from uuid import UUID
from pydantic import BaseModel, Field, field_validator

USERNAME_REGEX = re.compile(r"^[a-zA-Z0-9_]{3,30}$")


class ProfileBase(BaseModel):
    display_name: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="The user's preferred display name.",
    )
    bio: Optional[str] = Field(
        None,
        max_length=500,
        description="Short personal introduction, interests, or what you're working on.",
    )
    avatar_url: Optional[str] = Field(
        None,
        max_length=2048,
        description="URL pointing to an avatar image.",
    )
    interests: Optional[List[str]] = Field(
        None,
        description="List of user interests or topic tags (e.g. coding, design, reading).",
    )

    @field_validator("interests")
    @classmethod
    def validate_interests(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return None
        cleaned = []
        for item in v:
            c = str(item).strip()
            if c and len(c) <= 30 and c.lower() not in [x.lower() for x in cleaned]:
                cleaned.append(c)
        return cleaned[:10]


class ProfileCreate(ProfileBase):
    username: str = Field(
        ...,
        min_length=3,
        max_length=30,
        description="Unique username consisting of letters, numbers, and underscores.",
    )

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        clean = v.strip().lower()
        if not USERNAME_REGEX.match(clean):
            raise ValueError(
                "Username must be between 3 and 30 characters and contain only letters, numbers, and underscores."
            )
        return clean

    @field_validator("display_name")
    @classmethod
    def validate_display_name(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("Display name cannot be empty or only whitespace.")
        return clean


class ProfileUpdate(BaseModel):
    username: Optional[str] = Field(
        None,
        min_length=3,
        max_length=30,
        description="Updated username.",
    )
    display_name: Optional[str] = Field(
        None,
        min_length=1,
        max_length=50,
        description="Updated display name.",
    )
    bio: Optional[str] = Field(
        None,
        max_length=500,
        description="Updated bio.",
    )
    avatar_url: Optional[str] = Field(
        None,
        max_length=2048,
        description="Updated avatar URL.",
    )
    interests: Optional[List[str]] = Field(
        None,
        description="Updated interests or topic tags.",
    )

    @field_validator("interests")
    @classmethod
    def validate_interests(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return None
        cleaned = []
        for item in v:
            c = str(item).strip()
            if c and len(c) <= 30 and c.lower() not in [x.lower() for x in cleaned]:
                cleaned.append(c)
        return cleaned[:10]

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        clean = v.strip().lower()
        if not USERNAME_REGEX.match(clean):
            raise ValueError(
                "Username must be between 3 and 30 characters and contain only letters, numbers, and underscores."
            )
        return clean

    @field_validator("display_name")
    @classmethod
    def validate_display_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        clean = v.strip()
        if not clean:
            raise ValueError("Display name cannot be empty or only whitespace.")
        return clean


class ProfileResponse(BaseModel):
    id: UUID
    username: str
    display_name: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    interests: List[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    @field_validator("interests", mode="before")
    @classmethod
    def parse_interests(cls, v: Any) -> List[str]:
        if v is None:
            return []
        if isinstance(v, list):
            return [str(item).strip() for item in v if str(item).strip()]
        if isinstance(v, str):
            v_str = v.strip()
            if not v_str:
                return []
            try:
                data = json.loads(v_str)
                if isinstance(data, list):
                    return [str(x).strip() for x in data if str(x).strip()]
            except Exception:
                pass
            return [s.strip() for s in v_str.split(",") if s.strip()]
        return []

    model_config = {
        "from_attributes": True,
    }
