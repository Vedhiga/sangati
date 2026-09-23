import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Index, UniqueConstraint
from sqlalchemy.sql import func

from app.db.base import Base
from app.models.profile import GUID


class PostLike(Base):
    __tablename__ = "post_likes"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    post_id = Column(GUID, ForeignKey("activity_posts.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(GUID, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("post_id", "user_id", name="uq_post_like"),
    )

    def __repr__(self) -> str:
        return f"<PostLike post={self.post_id} user={self.user_id}>"


class PostReaction(Base):
    __tablename__ = "post_reactions"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    post_id = Column(GUID, ForeignKey("activity_posts.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(GUID, nullable=False, index=True)
    reaction_type = Column(String(20), nullable=False)  # e.g., THUMBS_UP, HEART, FIRE, ROCKET, LIGHTBULB
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("post_id", "user_id", "reaction_type", name="uq_post_reaction"),
        Index("ix_post_reactions_post_user", "post_id", "user_id"),
    )

    def __repr__(self) -> str:
        return f"<PostReaction post={self.post_id} user={self.user_id} type={self.reaction_type}>"


class PostComment(Base):
    __tablename__ = "post_comments"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    post_id = Column(GUID, ForeignKey("activity_posts.id", ondelete="CASCADE"), nullable=False, index=True)
    author_id = Column(GUID, nullable=False, index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_post_comments_post_created", "post_id", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<PostComment id={self.id} post={self.post_id} author={self.author_id}>"
