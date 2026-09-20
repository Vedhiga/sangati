import logging
from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session

from app.models.post import ActivityPost
from app.models.profile import Profile
from app.schemas.post import (
    AuthorPublic,
    PostCreate,
    PostUpdate,
    PostResponse,
    PostsListResponse,
)
from app.schemas.activity import ActivityType, safe_parse_activity_type
from app.core.errors import (
    ProfileNotFoundException,
    PostNotFoundException,
    UnauthorizedPostActionException,
)

logger = logging.getLogger("sidequest.services.post")


def _build_author_public(profile: Optional[Profile], author_id: UUID) -> AuthorPublic:
    if profile:
        return AuthorPublic(
            user_id=profile.user_id,
            username=profile.username,
            display_name=profile.display_name,
            avatar_url=profile.avatar_url,
        )
    return AuthorPublic(
        user_id=author_id,
        username="unknown",
        display_name="Sangati User",
        avatar_url=None,
    )


class PostService:
    @staticmethod
    def create_post(db: Session, author_id: UUID, data: PostCreate) -> PostResponse:
        """
        Create a new activity post for the authenticated user.
        """
        profile = db.query(Profile).filter(Profile.user_id == author_id).first()
        if not profile:
            raise ProfileNotFoundException("You must create a profile before sharing posts.")

        post = ActivityPost(
            author_id=author_id,
            activity_type=data.activity_type.value,
            content=data.content,
            media_url=data.media_url,
            media_type=data.media_type,
            link_url=data.link_url,
            link_title=data.link_title,
            link_description=data.link_description,
            link_image=data.link_image,
        )
        db.add(post)
        db.commit()
        db.refresh(post)

        logger.info("Created post %s for user %s (activity=%s)", post.id, author_id, post.activity_type)

        return PostResponse(
            id=post.id,
            author_id=post.author_id,
            activity_type=safe_parse_activity_type(post.activity_type),
            content=post.content,
            media_url=getattr(post, "media_url", None),
            media_type=getattr(post, "media_type", None),
            link_url=getattr(post, "link_url", None),
            link_title=getattr(post, "link_title", None),
            link_description=getattr(post, "link_description", None),
            link_image=getattr(post, "link_image", None),
            author=_build_author_public(profile, author_id),
            created_at=post.created_at,
            updated_at=post.updated_at,
        )

    @staticmethod
    def get_posts(
        db: Session,
        activity_type: Optional[ActivityType] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> PostsListResponse:
        """
        Retrieve latest activity posts in strictly chronological order (newest first).
        """
        query = db.query(ActivityPost)
        if activity_type:
            query = query.filter(ActivityPost.activity_type == activity_type.value)

        total = query.count()
        posts = (
            query.order_by(ActivityPost.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

        if not posts:
            return PostsListResponse(posts=[], total=total, limit=limit, offset=offset)

        # Batch load author profiles
        author_ids = list({p.author_id for p in posts})
        profiles = db.query(Profile).filter(Profile.user_id.in_(author_ids)).all()
        profile_map = {p.user_id: p for p in profiles}

        result_items: List[PostResponse] = []
        for p in posts:
            author_prof = profile_map.get(p.author_id)
            result_items.append(
                PostResponse(
                    id=p.id,
                    author_id=p.author_id,
                    activity_type=safe_parse_activity_type(p.activity_type),
                    content=p.content,
                    media_url=getattr(p, "media_url", None),
                    media_type=getattr(p, "media_type", None),
                    link_url=getattr(p, "link_url", None),
                    link_title=getattr(p, "link_title", None),
                    link_description=getattr(p, "link_description", None),
                    link_image=getattr(p, "link_image", None),
                    author=_build_author_public(author_prof, p.author_id),
                    created_at=p.created_at,
                    updated_at=p.updated_at,
                )
            )

        return PostsListResponse(
            posts=result_items,
            total=total,
            limit=limit,
            offset=offset,
        )

    @staticmethod
    def get_user_posts(
        db: Session,
        user_id: UUID,
        limit: int = 20,
        offset: int = 0,
    ) -> PostsListResponse:
        """
        Retrieve all public posts authored by a specific user, newest first.
        """
        profile = db.query(Profile).filter(Profile.user_id == user_id).first()
        if not profile:
            raise ProfileNotFoundException("User profile not found.")

        query = db.query(ActivityPost).filter(ActivityPost.author_id == user_id)
        total = query.count()
        posts = (
            query.order_by(ActivityPost.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

        author_public = _build_author_public(profile, user_id)
        result_items = [
            PostResponse(
                id=p.id,
                author_id=p.author_id,
                activity_type=safe_parse_activity_type(p.activity_type),
                content=p.content,
                media_url=getattr(p, "media_url", None),
                media_type=getattr(p, "media_type", None),
                link_url=getattr(p, "link_url", None),
                link_title=getattr(p, "link_title", None),
                link_description=getattr(p, "link_description", None),
                link_image=getattr(p, "link_image", None),
                author=author_public,
                created_at=p.created_at,
                updated_at=p.updated_at,
            )
            for p in posts
        ]

        return PostsListResponse(
            posts=result_items,
            total=total,
            limit=limit,
            offset=offset,
        )

    @staticmethod
    def update_post(
        db: Session,
        post_id: UUID,
        current_user_id: UUID,
        data: PostUpdate,
    ) -> PostResponse:
        """
        Update the content of an existing post. Only the post author can update it.
        """
        post = db.query(ActivityPost).filter(ActivityPost.id == post_id).first()
        if not post:
            raise PostNotFoundException("Post not found.")

        if post.author_id != current_user_id:
            raise UnauthorizedPostActionException("You can only edit your own posts.")

        post.content = data.content
        if data.media_url is not None:
            post.media_url = data.media_url
        if data.media_type is not None:
            post.media_type = data.media_type
        if data.link_url is not None:
            post.link_url = data.link_url
        if data.link_title is not None:
            post.link_title = data.link_title
        if data.link_description is not None:
            post.link_description = data.link_description
        if data.link_image is not None:
            post.link_image = data.link_image

        db.commit()
        db.refresh(post)

        profile = db.query(Profile).filter(Profile.user_id == post.author_id).first()
        logger.info("Updated post %s by author %s", post_id, current_user_id)

        return PostResponse(
            id=post.id,
            author_id=post.author_id,
            activity_type=safe_parse_activity_type(post.activity_type),
            content=post.content,
            media_url=getattr(post, "media_url", None),
            media_type=getattr(post, "media_type", None),
            link_url=getattr(post, "link_url", None),
            link_title=getattr(post, "link_title", None),
            link_description=getattr(post, "link_description", None),
            link_image=getattr(post, "link_image", None),
            author=_build_author_public(profile, post.author_id),
            created_at=post.created_at,
            updated_at=post.updated_at,
        )

    @staticmethod
    def delete_post(db: Session, post_id: UUID, current_user_id: UUID) -> None:
        """
        Delete a post. Only the post author can delete it.
        """
        post = db.query(ActivityPost).filter(ActivityPost.id == post_id).first()
        if not post:
            raise PostNotFoundException("Post not found.")

        if post.author_id != current_user_id:
            raise UnauthorizedPostActionException("You can only delete your own posts.")

        db.delete(post)
        db.commit()
        logger.info("Deleted post %s by author %s", post_id, current_user_id)
