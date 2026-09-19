import json
from datetime import datetime
from enum import Enum
from typing import Any, List, Optional
from uuid import UUID
from pydantic import BaseModel, Field, field_validator

from app.schemas.activity import ActivityType


class ConnectionStatus(str, Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"


class ConnectionUserPublic(BaseModel):
    id: UUID = Field(..., description="Profile ID")
    user_id: UUID = Field(..., description="User Account ID")
    username: str
    display_name: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    activity: Optional[ActivityType] = None
    interests: List[str] = Field(default_factory=list)

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


class ConnectionResponse(BaseModel):
    id: UUID
    requester_id: UUID
    receiver_id: UUID
    status: ConnectionStatus
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True,
    }


class ConnectionRequestItem(BaseModel):
    id: UUID = Field(..., description="Connection ID")
    created_at: datetime
    requester: ConnectionUserPublic


class IncomingRequestsResponse(BaseModel):
    requests: List[ConnectionRequestItem]
    total: int


class ConnectedPersonItem(BaseModel):
    id: UUID = Field(..., description="Connection ID")
    connected_at: datetime
    user: ConnectionUserPublic


class ConnectionsListResponse(BaseModel):
    connections: List[ConnectedPersonItem]
    total: int


class ConnectionActionSuccess(BaseModel):
    success: bool = True
    message: str
