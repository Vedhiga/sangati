from typing import List, Optional, Any
import json
from uuid import UUID
from pydantic import BaseModel, Field, field_validator

from enum import Enum
from app.schemas.activity import ActivityType


class PersonConnectionStatus(str, Enum):
    NONE = "NONE"
    REQUEST_SENT = "REQUEST_SENT"
    REQUEST_RECEIVED = "REQUEST_RECEIVED"
    CONNECTED = "CONNECTED"


class DiscoveryPerson(BaseModel):
    id: UUID = Field(..., description="Profile ID")
    user_id: UUID = Field(..., description="User account ID")
    username: str
    display_name: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    interests: List[str] = Field(default_factory=list)
    activity: Optional[ActivityType] = Field(None, description="Active intent/activity")
    match_reason: Optional[str] = Field(None, description="Human-readable reason for the match")
    connection_status: PersonConnectionStatus = Field(
        default=PersonConnectionStatus.NONE,
        description="Connection status relative to the authenticated viewer",
    )
    connection_id: Optional[UUID] = Field(
        default=None,
        description="ID of connection if request exists or connected",
    )

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


class DiscoveryResponse(BaseModel):
    people: List[DiscoveryPerson]
    total: int
    current_user_activity: Optional[ActivityType] = None
