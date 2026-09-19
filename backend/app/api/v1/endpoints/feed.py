from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user, AuthenticatedUser
from app.schemas.feed import FeedResponse
from app.services.feed_service import FeedService

router = APIRouter(prefix="/feed", tags=["Personalized Feed"])


@router.get(
    "",
    response_model=FeedResponse,
    summary="Get personalized activity feed",
)
def get_feed(
    limit: int = Query(20, ge=1, le=50, description="Max posts to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Retrieve the current user's personalized feed ranked by activity alignment,
    connections, topic interests, and recency.
    """
    return FeedService.get_personalized_feed(
        db=db,
        viewer_id=current_user.id,
        limit=limit,
        offset=offset,
    )
