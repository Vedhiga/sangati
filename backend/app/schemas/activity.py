from enum import Enum
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


class ActivityType(str, Enum):
    BUILD = "BUILD"
    LEARN = "LEARN"
    CONVERSATION = "CONVERSATION"
    EXPLORE = "EXPLORE"


class ActivityUpdate(BaseModel):
    activity_type: ActivityType = Field(
        ...,
        description="The selected activity type: BUILD, LEARN, CONVERSATION, or EXPLORE.",
    )


class ActivityResponse(BaseModel):
    id: UUID
    activity_type: ActivityType
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True,
    }
