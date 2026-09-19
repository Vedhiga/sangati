import logging
from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session

from app.models.activity import UserActivity
from app.schemas.activity import ActivityUpdate

logger = logging.getLogger("sidequest.services.activity")


class ActivityService:
    @staticmethod
    def get_by_user_id(db: Session, user_id: UUID) -> Optional[UserActivity]:
        return db.query(UserActivity).filter(UserActivity.user_id == user_id).first()

    @staticmethod
    def upsert_activity(db: Session, user_id: UUID, activity_in: ActivityUpdate) -> UserActivity:
        activity = ActivityService.get_by_user_id(db, user_id)
        if activity:
            activity.activity_type = activity_in.activity_type.value
        else:
            activity = UserActivity(
                user_id=user_id,
                activity_type=activity_in.activity_type.value,
            )
            db.add(activity)

        db.commit()
        db.refresh(activity)
        return activity
