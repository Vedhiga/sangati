from typing import List, Optional
from pydantic import BaseModel
from app.schemas.post import PostResponse
from app.schemas.activity import ActivityType


class FeedPagination(BaseModel):
    limit: int
    offset: int
    has_more: bool


class FeedResponse(BaseModel):
    posts: List[PostResponse]
    pagination: FeedPagination
    current_user_activity: Optional[ActivityType] = None
