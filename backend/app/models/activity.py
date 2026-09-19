import uuid
from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func

from app.db.base import Base
from app.models.profile import GUID


class UserActivity(Base):
    __tablename__ = "user_activities"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, unique=True, nullable=False, index=True)
    activity_type = Column(String(20), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self) -> str:
        return f"<UserActivity user_id={self.user_id} activity_type={self.activity_type}>"
