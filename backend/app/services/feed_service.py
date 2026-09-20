import logging
from typing import List, Optional, Set
from uuid import UUID
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.post import ActivityPost
from app.models.profile import Profile
from app.models.activity import UserActivity
from app.models.connection import Connection, ConnectionStatus
from app.schemas.activity import ActivityType, safe_parse_activity_type
from app.schemas.post import PostResponse
from app.schemas.feed import FeedResponse, FeedPagination
from app.services.post_service import _build_author_public
from app.services.discovery_service import _parse_interests
from app.services.feed_ranker import FeedRanker
from datetime import datetime, timezone

logger = logging.getLogger("sidequest.services.feed")


class FeedService:
    @staticmethod
    def get_feed_candidates(
        db: Session,
        viewer_id: UUID,
        candidate_limit: int = 150,
    ) -> List[ActivityPost]:
        """
        Retrieves a candidate pool of recent posts from the community,
        including the viewer's own posts.
        """
        return (
            db.query(ActivityPost)
            .order_by(ActivityPost.created_at.desc())
            .limit(candidate_limit)
            .all()
        )

    @staticmethod
    def get_personalized_feed(
        db: Session,
        viewer_id: UUID,
        limit: int = 20,
        offset: int = 0,
    ) -> FeedResponse:
        """
        Synthesizes active intent, connections, interest overlap, and recency
        to produce a ranked, diverse personal feed.
        """
        # 1. Viewer context: Profile & Interests
        viewer_prof = db.query(Profile).filter(Profile.user_id == viewer_id).first()
        viewer_interests = _parse_interests(viewer_prof.interests) if viewer_prof else []

        # 2. Viewer context: Current Active Intent
        viewer_act_record = (
            db.query(UserActivity).filter(UserActivity.user_id == viewer_id).first()
        )
        viewer_activity: Optional[ActivityType] = None
        if viewer_act_record and viewer_act_record.activity_type:
            viewer_activity = safe_parse_activity_type(viewer_act_record.activity_type)

        # 3. Viewer context: Mutual Connections
        accepted_conns = (
            db.query(Connection)
            .filter(
                or_(Connection.requester_id == viewer_id, Connection.receiver_id == viewer_id),
                Connection.status == ConnectionStatus.ACCEPTED.value,
            )
            .all()
        )
        connected_user_ids: Set[UUID] = {
            c.receiver_id if c.requester_id == viewer_id else c.requester_id
            for c in accepted_conns
        }

        # 4. Gather candidate pool
        candidates = FeedService.get_feed_candidates(db, viewer_id)

        if not candidates:
            return FeedResponse(
                posts=[],
                pagination=FeedPagination(limit=limit, offset=offset, has_more=False),
                current_user_activity=viewer_activity,
            )

        # 5. Batch-load author profiles
        author_ids = list({p.author_id for p in candidates})
        profiles = db.query(Profile).filter(Profile.user_id.in_(author_ids)).all()
        profile_map = {p.user_id: p for p in profiles}

        # 6. Score each candidate
        scored_items = []
        for post in candidates:
            author_prof = profile_map.get(post.author_id)
            score = FeedRanker.calculate_post_score(
                post=post,
                author_profile=author_prof,
                viewer_activity=viewer_activity,
                connected_user_ids=connected_user_ids,
                viewer_interests=viewer_interests,
            )
            created_dt = post.created_at or datetime.now(timezone.utc)
            scored_items.append(
                {
                    "post": post,
                    "author_profile": author_prof,
                    "author_id": post.author_id,
                    "score": score,
                    "created_at": created_dt,
                }
            )

        # 7. Sort by score descending, then created_at descending
        scored_items.sort(key=lambda x: (x["score"], x["created_at"]), reverse=True)

        # 8. Apply author diversity interleaving
        diverse_items = FeedRanker.apply_author_diversity(scored_items, max_consecutive=2)

        # 9. Paginate
        total_items = len(diverse_items)
        page_slice = diverse_items[offset : offset + limit]
        has_more = (offset + limit) < total_items

        # 10. Assemble response safely
        result_posts = []
        for item in page_slice:
            post_obj = item["post"]
            c_at = post_obj.created_at or datetime.now(timezone.utc)
            u_at = post_obj.updated_at or c_at
            result_posts.append(
                PostResponse(
                    id=post_obj.id,
                    author_id=post_obj.author_id,
                    activity_type=safe_parse_activity_type(post_obj.activity_type),
                    content=post_obj.content,
                    media_url=getattr(post_obj, "media_url", None),
                    media_type=getattr(post_obj, "media_type", None),
                    link_url=getattr(post_obj, "link_url", None),
                    link_title=getattr(post_obj, "link_title", None),
                    link_description=getattr(post_obj, "link_description", None),
                    link_image=getattr(post_obj, "link_image", None),
                    author=_build_author_public(item["author_profile"], post_obj.author_id),
                    created_at=c_at,
                    updated_at=u_at,
                )
            )

        logger.info(
            "Rendered feed for user %s: %d candidates -> %d ranked items (page size %d)",
            viewer_id,
            len(candidates),
            total_items,
            len(result_posts),
        )

        return FeedResponse(
            posts=result_posts,
            pagination=FeedPagination(
                limit=limit,
                offset=offset,
                has_more=has_more,
            ),
            current_user_activity=viewer_activity,
        )
