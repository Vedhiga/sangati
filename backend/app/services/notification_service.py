import logging
from typing import List, Optional, Dict
from uuid import UUID
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.notification import Notification, NotificationType
from app.models.profile import Profile
from app.schemas.notification import (
    ActorPublic,
    NotificationResponse,
    NotificationsListResponse,
    UnreadCountResponse,
    MarkAllReadResponse,
)
from app.core.errors import (
    NotificationNotFoundException,
    UnauthorizedNotificationActionException,
)

logger = logging.getLogger("sidequest.services.notification")


class NotificationService:
    @staticmethod
    def create_notification(
        db: Session,
        recipient_id: UUID,
        actor_id: Optional[UUID],
        type: NotificationType,
        title: str,
        message: str,
        reference_id: Optional[UUID] = None,
    ) -> Optional[Notification]:
        """
        Create and persist a notification.
        Enforces:
        - Never notifies the actor themselves (actor_id == recipient_id).
        - Deduplication for connection requests / acceptances to prevent duplicate notifications from retried requests.
        """
        # Self-notification guard
        if actor_id and str(actor_id) == str(recipient_id):
            return None

        # Deduplication guard: for connection events, ensure only one notification per reference_id
        if type in (NotificationType.CONNECTION_REQUEST, NotificationType.CONNECTION_ACCEPTED) and reference_id:
            existing = (
                db.query(Notification)
                .filter(
                    Notification.recipient_id == recipient_id,
                    Notification.actor_id == actor_id,
                    Notification.type == type.value,
                    Notification.reference_id == reference_id,
                )
                .first()
            )
            if existing:
                logger.info(
                    "Duplicate notification avoided for recipient=%s actor=%s type=%s ref=%s",
                    recipient_id,
                    actor_id,
                    type.value,
                    reference_id,
                )
                return existing

        notification = Notification(
            recipient_id=recipient_id,
            actor_id=actor_id,
            type=type.value,
            title=title,
            message=message,
            reference_id=reference_id,
            is_read=False,
        )
        db.add(notification)
        db.flush()

        logger.info(
            "Created notification %s of type %s for recipient %s",
            notification.id,
            type.value,
            recipient_id,
        )
        return notification

    @staticmethod
    def get_user_notifications(
        db: Session,
        user_id: UUID,
        limit: int = 20,
        offset: int = 0,
    ) -> NotificationsListResponse:
        """
        Retrieve paginated notifications for the authenticated user, sorted newest first.
        Includes public actor profile info when actor_id is present.
        """
        total = (
            db.query(func.count(Notification.id))
            .filter(Notification.recipient_id == user_id)
            .scalar()
            or 0
        )

        records = (
            db.query(Notification)
            .filter(Notification.recipient_id == user_id)
            .order_by(Notification.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

        # Batch-fetch actor profiles to avoid N+1 queries
        actor_ids = {n.actor_id for n in records if n.actor_id is not None}
        profiles_by_id: Dict[UUID, Profile] = {}
        if actor_ids:
            profiles = db.query(Profile).filter(Profile.user_id.in_(actor_ids)).all()
            profiles_by_id = {p.user_id: p for p in profiles}

        items: List[NotificationResponse] = []
        for n in records:
            actor_data: Optional[ActorPublic] = None
            if n.actor_id and n.actor_id in profiles_by_id:
                prof = profiles_by_id[n.actor_id]
                actor_data = ActorPublic(
                    user_id=prof.user_id,
                    username=prof.username,
                    display_name=prof.display_name,
                    avatar_url=prof.avatar_url,
                )

            items.append(
                NotificationResponse(
                    id=n.id,
                    recipient_id=n.recipient_id,
                    actor_id=n.actor_id,
                    actor=actor_data,
                    type=NotificationType(n.type),
                    title=n.title,
                    message=n.message,
                    reference_id=n.reference_id,
                    is_read=n.is_read,
                    created_at=n.created_at,
                )
            )

        return NotificationsListResponse(
            notifications=items,
            total=total,
            limit=limit,
            offset=offset,
        )

    @staticmethod
    def get_unread_count(db: Session, user_id: UUID) -> UnreadCountResponse:
        """
        Get the count of unread notifications for the authenticated user.
        """
        count = (
            db.query(func.count(Notification.id))
            .filter(
                Notification.recipient_id == user_id,
                Notification.is_read == False,
            )
            .scalar()
            or 0
        )
        return UnreadCountResponse(count=count)

    @staticmethod
    def mark_as_read(
        db: Session,
        notification_id: UUID,
        user_id: UUID,
    ) -> NotificationResponse:
        """
        Mark a single notification as read.
        Verifies ownership: only the recipient can mark as read.
        """
        notification = (
            db.query(Notification).filter(Notification.id == notification_id).first()
        )
        if not notification:
            raise NotificationNotFoundException("Notification not found.")

        if str(notification.recipient_id) != str(user_id):
            raise UnauthorizedNotificationActionException(
                "You are not authorized to access this notification."
            )

        if not notification.is_read:
            notification.is_read = True
            db.commit()
            db.refresh(notification)

        actor_data: Optional[ActorPublic] = None
        if notification.actor_id:
            prof = (
                db.query(Profile)
                .filter(Profile.user_id == notification.actor_id)
                .first()
            )
            if prof:
                actor_data = ActorPublic(
                    user_id=prof.user_id,
                    username=prof.username,
                    display_name=prof.display_name,
                    avatar_url=prof.avatar_url,
                )

        return NotificationResponse(
            id=notification.id,
            recipient_id=notification.recipient_id,
            actor_id=notification.actor_id,
            actor=actor_data,
            type=NotificationType(notification.type),
            title=notification.title,
            message=notification.message,
            reference_id=notification.reference_id,
            is_read=notification.is_read,
            created_at=notification.created_at,
        )

    @staticmethod
    def mark_all_read(db: Session, user_id: UUID) -> MarkAllReadResponse:
        """
        Mark all notifications belonging to the authenticated user as read.
        """
        updated_count = (
            db.query(Notification)
            .filter(
                Notification.recipient_id == user_id,
                Notification.is_read == False,
            )
            .update({Notification.is_read: True}, synchronize_session=False)
        )
        db.commit()
        logger.info("Marked %d notifications as read for user %s", updated_count, user_id)
        return MarkAllReadResponse(marked_read=updated_count)
