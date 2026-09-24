import logging
from typing import Dict, List, Optional, Set
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.post import ActivityPost
from app.models.post_interactions import PostLike, PostReaction, PostComment
from app.models.profile import Profile
from app.schemas.post import (
    AuthorPublic,
    PostCreate,
    PostUpdate,
    PostResponse,
    PostsListResponse,
    CommentCreate,
    CommentResponse,
    CommentsListResponse,
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


def _enrich_posts_metadata(
    db: Session,
    posts: List[ActivityPost],
    profile_map: Dict[UUID, Profile],
    current_user_id: Optional[UUID] = None,
) -> List[PostResponse]:
    if not posts:
        return []

    post_ids = [p.id for p in posts]

    # Likes counts
    likes_counts_query = (
        db.query(PostLike.post_id, func.count(PostLike.id))
        .filter(PostLike.post_id.in_(post_ids))
        .group_by(PostLike.post_id)
        .all()
    )
    likes_count_map: Dict[UUID, int] = {p_id: count for p_id, count in likes_counts_query}

    # User liked set
    user_liked_post_ids: Set[UUID] = set()
    if current_user_id:
        user_likes = (
            db.query(PostLike.post_id)
            .filter(PostLike.post_id.in_(post_ids), PostLike.user_id == current_user_id)
            .all()
        )
        user_liked_post_ids = {ul[0] for ul in user_likes}

    # Reactions summary & user reactions (single reaction per user)
    all_reactions = (
        db.query(PostReaction.post_id, PostReaction.user_id, PostReaction.reaction_type)
        .filter(PostReaction.post_id.in_(post_ids))
        .all()
    )
    reactions_summary_map: Dict[UUID, Dict[str, int]] = {}
    user_reaction_map: Dict[UUID, Optional[str]] = {}

    for p_id, u_id, r_type in all_reactions:
        # summary
        if p_id not in reactions_summary_map:
            reactions_summary_map[p_id] = {}
        reactions_summary_map[p_id][r_type] = reactions_summary_map[p_id].get(r_type, 0) + 1

        # single user reaction per post
        if current_user_id and u_id == current_user_id:
            user_reaction_map[p_id] = r_type

    # Comments count
    comments_counts_query = (
        db.query(PostComment.post_id, func.count(PostComment.id))
        .filter(PostComment.post_id.in_(post_ids))
        .group_by(PostComment.post_id)
        .all()
    )
    comments_count_map: Dict[UUID, int] = {p_id: count for p_id, count in comments_counts_query}

    results: List[PostResponse] = []
    for p in posts:
        author_prof = profile_map.get(p.author_id)
        single_reaction = user_reaction_map.get(p.id)
        results.append(
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
                likes_count=likes_count_map.get(p.id, 0),
                is_liked_by_user=(p.id in user_liked_post_ids),
                user_reaction=single_reaction,
                user_reactions=[single_reaction] if single_reaction else [],
                reactions_summary=reactions_summary_map.get(p.id, {}),
                comments_count=comments_count_map.get(p.id, 0),
                created_at=p.created_at,
                updated_at=p.updated_at,
            )
        )
    return results


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
        return _enrich_posts_metadata(db, [post], {author_id: profile}, author_id)[0]

    @staticmethod
    def get_posts(
        db: Session,
        activity_type: Optional[ActivityType] = None,
        limit: int = 20,
        offset: int = 0,
        current_user_id: Optional[UUID] = None,
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

        author_ids = list({p.author_id for p in posts})
        profiles = db.query(Profile).filter(Profile.user_id.in_(author_ids)).all()
        profile_map = {p.user_id: p for p in profiles}

        result_items = _enrich_posts_metadata(db, posts, profile_map, current_user_id)

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
        current_user_id: Optional[UUID] = None,
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

        result_items = _enrich_posts_metadata(db, posts, {user_id: profile}, current_user_id)

        return PostsListResponse(
            posts=result_items,
            total=total,
            limit=limit,
            offset=offset,
        )

    @staticmethod
    def get_single_post(db: Session, post_id: UUID, current_user_id: Optional[UUID] = None) -> PostResponse:
        post = db.query(ActivityPost).filter(ActivityPost.id == post_id).first()
        if not post:
            raise PostNotFoundException("Post not found.")
        profile = db.query(Profile).filter(Profile.user_id == post.author_id).first()
        return _enrich_posts_metadata(db, [post], {post.author_id: profile} if profile else {}, current_user_id)[0]

    @staticmethod
    def update_post(
        db: Session,
        post_id: UUID,
        current_user_id: UUID,
        data: PostUpdate,
    ) -> PostResponse:
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
        return _enrich_posts_metadata(db, [post], {post.author_id: profile} if profile else {}, current_user_id)[0]

    @staticmethod
    def delete_post(db: Session, post_id: UUID, current_user_id: UUID) -> None:
        post = db.query(ActivityPost).filter(ActivityPost.id == post_id).first()
        if not post:
            raise PostNotFoundException("Post not found.")

        if post.author_id != current_user_id:
            raise UnauthorizedPostActionException("You can only delete your own posts.")

        db.delete(post)
        db.commit()
        logger.info("Deleted post %s by author %s", post_id, current_user_id)

    # --- LIKES & REACTIONS ---
    @staticmethod
    def toggle_like(db: Session, post_id: UUID, current_user_id: UUID) -> PostResponse:
        post = db.query(ActivityPost).filter(ActivityPost.id == post_id).first()
        if not post:
            raise PostNotFoundException("Post not found.")

        existing = (
            db.query(PostLike)
            .filter(PostLike.post_id == post_id, PostLike.user_id == current_user_id)
            .first()
        )
        if existing:
            db.delete(existing)
        else:
            db.add(PostLike(post_id=post_id, user_id=current_user_id))
        db.commit()

        return PostService.get_single_post(db, post_id, current_user_id)

    @staticmethod
    def toggle_reaction(db: Session, post_id: UUID, current_user_id: UUID, reaction_type: str) -> PostResponse:
        post = db.query(ActivityPost).filter(ActivityPost.id == post_id).first()
        if not post:
            raise PostNotFoundException("Post not found.")

        reaction_type_clean = reaction_type.strip().upper()
        existing = (
            db.query(PostReaction)
            .filter(
                PostReaction.post_id == post_id,
                PostReaction.user_id == current_user_id,
            )
            .first()
        )
        if existing:
            if existing.reaction_type == reaction_type_clean:
                db.delete(existing)
            else:
                existing.reaction_type = reaction_type_clean
        else:
            db.add(PostReaction(post_id=post_id, user_id=current_user_id, reaction_type=reaction_type_clean))
        db.commit()

        return PostService.get_single_post(db, post_id, current_user_id)

    @staticmethod
    def remove_reaction(db: Session, post_id: UUID, current_user_id: UUID) -> PostResponse:
        post = db.query(ActivityPost).filter(ActivityPost.id == post_id).first()
        if not post:
            raise PostNotFoundException("Post not found.")

        existing = (
            db.query(PostReaction)
            .filter(
                PostReaction.post_id == post_id,
                PostReaction.user_id == current_user_id,
            )
            .first()
        )
        if existing:
            db.delete(existing)
            db.commit()

        return PostService.get_single_post(db, post_id, current_user_id)

    # --- COMMENTS ---
    @staticmethod
    def get_comments(db: Session, post_id: UUID) -> CommentsListResponse:
        post = db.query(ActivityPost).filter(ActivityPost.id == post_id).first()
        if not post:
            raise PostNotFoundException("Post not found.")

        comments = (
            db.query(PostComment)
            .filter(PostComment.post_id == post_id)
            .order_by(PostComment.created_at.asc())
            .all()
        )

        if not comments:
            return CommentsListResponse(comments=[], total=0)

        author_ids = list({c.author_id for c in comments})
        profiles = db.query(Profile).filter(Profile.user_id.in_(author_ids)).all()
        profile_map = {p.user_id: p for p in profiles}

        result_comments = [
            CommentResponse(
                id=c.id,
                post_id=c.post_id,
                author_id=c.author_id,
                content=c.content,
                author=_build_author_public(profile_map.get(c.author_id), c.author_id),
                created_at=c.created_at,
                updated_at=c.updated_at,
            )
            for c in comments
        ]

        return CommentsListResponse(comments=result_comments, total=len(result_comments))

    @staticmethod
    def create_comment(db: Session, post_id: UUID, author_id: UUID, data: CommentCreate) -> CommentResponse:
        post = db.query(ActivityPost).filter(ActivityPost.id == post_id).first()
        if not post:
            raise PostNotFoundException("Post not found.")

        profile = db.query(Profile).filter(Profile.user_id == author_id).first()
        if not profile:
            raise ProfileNotFoundException("Profile required before adding comments.")

        comment = PostComment(
            post_id=post_id,
            author_id=author_id,
            content=data.content,
        )
        db.add(comment)
        db.commit()
        db.refresh(comment)

        return CommentResponse(
            id=comment.id,
            post_id=comment.post_id,
            author_id=comment.author_id,
            content=comment.content,
            author=_build_author_public(profile, author_id),
            created_at=comment.created_at,
            updated_at=comment.updated_at,
        )

    @staticmethod
    def update_comment(
        db: Session,
        post_id: UUID,
        comment_id: UUID,
        current_user_id: UUID,
        data: CommentCreate,
    ) -> CommentResponse:
        comment = (
            db.query(PostComment)
            .filter(PostComment.id == comment_id, PostComment.post_id == post_id)
            .first()
        )
        if not comment:
            raise PostNotFoundException("Comment not found.")

        if comment.author_id != current_user_id:
            raise UnauthorizedPostActionException("You can only edit your own comments.")

        comment.content = data.content
        db.commit()
        db.refresh(comment)

        profile = db.query(Profile).filter(Profile.user_id == current_user_id).first()
        return CommentResponse(
            id=comment.id,
            post_id=comment.post_id,
            author_id=comment.author_id,
            content=comment.content,
            author=_build_author_public(profile, current_user_id),
            created_at=comment.created_at,
            updated_at=comment.updated_at,
        )

    @staticmethod
    def delete_comment(db: Session, post_id: UUID, comment_id: UUID, current_user_id: UUID) -> None:
        comment = (
            db.query(PostComment)
            .filter(PostComment.id == comment_id, PostComment.post_id == post_id)
            .first()
        )
        if not comment:
            raise PostNotFoundException("Comment not found.")

        if comment.author_id != current_user_id:
            raise UnauthorizedPostActionException("You can only delete your own comments.")

        db.delete(comment)
        db.commit()

