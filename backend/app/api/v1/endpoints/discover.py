from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user, AuthenticatedUser
from app.schemas.discovery import DiscoveryResponse
from app.schemas.error import ErrorResponse
from app.services.discovery_service import DiscoveryService

router = APIRouter(
    prefix="/discover",
    tags=["Discovery"],
    responses={
        401: {"model": ErrorResponse, "description": "Authentication required or invalid token"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)


@router.get(
    "",
    response_model=DiscoveryResponse,
    summary="Discover People",
)
def discover_people(
    activity: Optional[str] = Query(
        None,
        description="Optional activity filter: BUILD, LEARN, CONVERSATION, EXPLORE, or ALL",
    ),
    limit: int = Query(20, ge=1, le=50, description="Max number of people to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Discover people in the community matching the user's active intent or interest.
    Strictly excludes the authenticated user from the result set.
    """
    return DiscoveryService.get_discovery_feed(
        db=db,
        current_user_id=current_user.id,
        activity_filter=activity,
        limit=limit,
        offset=offset,
    )
