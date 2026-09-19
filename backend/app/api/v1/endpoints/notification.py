from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user, AuthenticatedUser
from app.schemas.notification import (
    NotificationResponse,
    NotificationsListResponse,
    UnreadCountResponse,
    MarkAllReadResponse,
)
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get(
    "",
    response_model=NotificationsListResponse,
    summary="Get paginated notifications for current user",
)
def get_notifications(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Retrieve notifications for the authenticated user, ordered newest first.
    Recipient ID is strictly derived from authentication.
    """
    return NotificationService.get_user_notifications(
        db=db,
        user_id=current_user.id,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/unread-count",
    response_model=UnreadCountResponse,
    summary="Get unread notifications count",
)
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Return the total number of unread notifications for the authenticated user.
    """
    return NotificationService.get_unread_count(
        db=db,
        user_id=current_user.id,
    )


@router.put(
    "/read-all",
    response_model=MarkAllReadResponse,
    summary="Mark all notifications as read",
)
def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Mark all unread notifications belonging to the authenticated user as read.
    """
    return NotificationService.mark_all_read(
        db=db,
        user_id=current_user.id,
    )


@router.put(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    summary="Mark a specific notification as read",
)
def mark_notification_as_read(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Mark a single notification as read.
    Enforces that only the recipient can perform this action.
    """
    return NotificationService.mark_as_read(
        db=db,
        notification_id=notification_id,
        user_id=current_user.id,
    )
