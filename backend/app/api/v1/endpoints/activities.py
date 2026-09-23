from typing import List, Optional, Union
from uuid import UUID
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user, AuthenticatedUser
from app.schemas.activity_system import (
    PublicActivityResponse,
    ParticipantActivityResponse,
    CreateActivityRequest,
    UpdateActivityRequest,
    ActivityInviteRequest,
)
from app.schemas.error import ErrorResponse
from app.schemas.conversation import ConversationDetailResponse
from app.services.activity_system_service import ActivitySystemService

router = APIRouter(
    prefix="/activities",
    tags=["Activities System"],
    responses={
        401: {"model": ErrorResponse, "description": "Authentication required"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)


@router.get(
    "",
    response_model=List[PublicActivityResponse],
    summary="List Discoverable Activities",
)
def list_activities(
    intent: Optional[str] = Query(None, description="Filter by intent (BUILD, LEARN, CONVERSATION, EXPLORE)"),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Retrieve all active community activities.
    Supports filtering by intent.
    """
    return ActivitySystemService.get_activities(
        db=db,
        current_user_id=current_user.id,
        intent_filter=intent,
    )


@router.post(
    "",
    response_model=ParticipantActivityResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Host a New Community Activity",
)
def create_activity(
    req: CreateActivityRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Create a new persistent community activity.
    The host becomes an automatic participant and receives private details.
    """
    return ActivitySystemService.create_activity(
        db=db,
        host_id=current_user.id,
        req=req,
    )


@router.get(
    "/{activity_id}",
    response_model=Union[ParticipantActivityResponse, PublicActivityResponse],
    summary="Get Activity Workspace Details",
)
def get_activity_detail(
    activity_id: UUID,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Get detailed information for an activity.
    Enforces authorization boundary: Meeting URL and private notes are ONLY returned if caller is a participant or host.
    """
    return ActivitySystemService.get_activity_detail(
        db=db,
        activity_id=activity_id,
        current_user_id=current_user.id,
    )


@router.post(
    "/{activity_id}/join",
    response_model=ParticipantActivityResponse,
    summary="Join an Activity",
)
def join_activity(
    activity_id: UUID,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Join an active community activity as a participant.
    Unlocks meeting URLs, session details, and private workspace.
    """
    return ActivitySystemService.join_activity(
        db=db,
        activity_id=activity_id,
        user_id=current_user.id,
    )


@router.post(
    "/{activity_id}/leave",
    response_model=PublicActivityResponse,
    summary="Leave an Activity",
)
def leave_activity(
    activity_id: UUID,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Leave an activity.
    Revokes participant access to private details.
    """
    return ActivitySystemService.leave_activity(
        db=db,
        activity_id=activity_id,
        user_id=current_user.id,
    )


@router.post(
    "/{activity_id}/pause",
    response_model=ParticipantActivityResponse,
    summary="Host Action: Pause Activity",
)
def pause_activity(
    activity_id: UUID,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Pause an activity. Temporarily puts upcoming sessions on hold.
    Only the host can execute this.
    """
    return ActivitySystemService.pause_activity(
        db=db,
        activity_id=activity_id,
        user_id=current_user.id,
    )


@router.post(
    "/{activity_id}/resume",
    response_model=ParticipantActivityResponse,
    summary="Host Action: Resume Activity",
)
def resume_activity(
    activity_id: UUID,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Resume a paused activity.
    Only the host can execute this.
    """
    return ActivitySystemService.resume_activity(
        db=db,
        activity_id=activity_id,
        user_id=current_user.id,
    )


@router.post(
    "/{activity_id}/end",
    response_model=ParticipantActivityResponse,
    summary="Host Action: End Activity Permanently",
)
def end_activity(
    activity_id: UUID,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Permanently end an activity.
    Only the host can execute this.
    """
    return ActivitySystemService.end_activity(
        db=db,
        activity_id=activity_id,
        user_id=current_user.id,
    )


@router.post(
    "/{activity_id}/invites",
    summary="Host Action: Invite Accepted Connections",
)
def invite_connections(
    activity_id: UUID,
    req: ActivityInviteRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Send activity invitations to accepted connections.
    Generates notifications for invited users.
    """
    invited_count = ActivitySystemService.invite_connections(
        db=db,
        activity_id=activity_id,
        host_id=current_user.id,
        connection_ids=req.connection_ids,
    )
    return {"status": "success", "invited_count": invited_count}


@router.get(
    "/{activity_id}/conversation",
    response_model=ConversationDetailResponse,
    summary="Get Activity Group Conversation",
)
def get_activity_conversation(
    activity_id: UUID,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Get the group conversation associated with an activity.
    Verifies user participant authorization.
    """
    from app.models.activity_system import Activity
    from app.services.activity_system_service import ActivitySystemService
    from app.services.conversation_service import ConversationService

    act = db.query(Activity).filter(Activity.id == activity_id).first()
    if not act:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found.",
        )

    convo = ActivitySystemService.ensure_activity_conversation(db, act)
    db.commit()

    return ConversationService.get_conversation_detail(
        db=db,
        conversation_id=convo.id,
        current_user_id=current_user.id,
    )

