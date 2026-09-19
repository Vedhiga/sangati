from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user, AuthenticatedUser
from app.schemas.activity import ActivityUpdate, ActivityResponse
from app.schemas.error import ErrorResponse
from app.services.activity_service import ActivityService

router = APIRouter(
    prefix="/activity",
    tags=["Activity"],
    responses={
        401: {"model": ErrorResponse, "description": "Authentication required or invalid token"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)


@router.get(
    "/me",
    response_model=Optional[ActivityResponse],
    summary="Get Current User Activity",
)
def get_my_activity(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve the current activity selection for the authenticated user.
    Returns null if no activity has been selected yet.
    """
    return ActivityService.get_by_user_id(db, current_user.id)


@router.put(
    "/me",
    response_model=ActivityResponse,
    summary="Set or Update Current User Activity",
    responses={
        400: {"model": ErrorResponse, "description": "Validation error or invalid activity type"},
    },
)
def update_my_activity(
    activity_in: ActivityUpdate,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Set or update the active activity selection for the authenticated user.
    Allowed values: BUILD, LEARN, CONVERSATION, EXPLORE.
    """
    return ActivityService.upsert_activity(
        db=db,
        user_id=current_user.id,
        activity_in=activity_in,
    )
