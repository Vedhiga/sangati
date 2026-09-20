import uuid
from sqlalchemy import Column, String, Text, DateTime, Index
from sqlalchemy.sql import func

from app.db.base import Base
from app.models.profile import GUID


class ActivityPost(Base):
    __tablename__ = "activity_posts"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    author_id = Column(GUID, nullable=False, index=True)
    activity_type = Column(String(20), nullable=False, index=True)
    content = Column(Text, nullable=False)

    # Attachments: Media & Link Previews
    media_url = Column(String, nullable=True)
    media_type = Column(String, nullable=True)
    link_url = Column(String, nullable=True)
    link_title = Column(String, nullable=True)
    link_description = Column(String, nullable=True)
    link_image = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_activity_posts_author_created", "author_id", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<ActivityPost id={self.id} author_id={self.author_id} activity={self.activity_type}>"
