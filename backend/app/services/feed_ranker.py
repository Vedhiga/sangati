from datetime import datetime, timezone
from typing import List, Optional, Set
from uuid import UUID

from app.models.post import ActivityPost
from app.models.profile import Profile
from app.schemas.activity import ActivityType
from app.services.discovery_service import _parse_interests


class FeedRanker:
    """
    Transparent, deterministic rule-based ranking engine for the SideQuest personalized feed.
    Score = Activity relevance (+3.0) + Connection relevance (+3.0) + Interest overlap (+2.0) + Recency (+2.0)
    """

    ACTIVITY_WEIGHT = 3.0
    EXPLORE_BASELINE_WEIGHT = 1.5
    CONNECTION_WEIGHT = 3.0
    INTEREST_MAX_WEIGHT = 2.0
    RECENCY_MAX_WEIGHT = 2.0
    RECENCY_HALF_LIFE_HOURS = 12.0

    @classmethod
    def calculate_activity_score(
        cls,
        post_activity: str,
        viewer_activity: Optional[ActivityType],
    ) -> float:
        if not viewer_activity:
            return 0.0

        if viewer_activity == ActivityType.EXPLORE:
            return cls.EXPLORE_BASELINE_WEIGHT

        if post_activity == viewer_activity.value:
            return cls.ACTIVITY_WEIGHT

        return 0.0

    @classmethod
    def calculate_connection_score(
        cls,
        author_id: UUID,
        connected_user_ids: Set[UUID],
    ) -> float:
        return cls.CONNECTION_WEIGHT if author_id in connected_user_ids else 0.0

    @classmethod
    def calculate_interest_score(
        cls,
        viewer_interests: List[str],
        author_interests_raw: Optional[str],
    ) -> float:
        if not viewer_interests or not author_interests_raw:
            return 0.0

        author_interests = _parse_interests(author_interests_raw)
        if not author_interests:
            return 0.0

        viewer_set = {t.lower().strip() for t in viewer_interests if t.strip()}
        author_set = {t.lower().strip() for t in author_interests if t.strip()}
        shared = viewer_set.intersection(author_set)

        # 1.0 point per shared interest tag, up to 2.0 max
        return min(cls.INTEREST_MAX_WEIGHT, len(shared) * 1.0)

    @classmethod
    def calculate_recency_score(
        cls,
        created_at: datetime,
        now: Optional[datetime] = None,
    ) -> float:
        if now is None:
            now = datetime.now(timezone.utc)

        # Normalize timezones
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        if now.tzinfo is None:
            now = now.replace(tzinfo=timezone.utc)

        age_seconds = max(0.0, (now - created_at).total_seconds())
        age_hours = age_seconds / 3600.0

        # Smooth, bounded decay: 2.0 at age=0, 1.0 at age=12h, 0.67 at age=24h
        return cls.RECENCY_MAX_WEIGHT / (1.0 + (age_hours / cls.RECENCY_HALF_LIFE_HOURS))

    @classmethod
    def calculate_post_score(
        cls,
        post: ActivityPost,
        author_profile: Optional[Profile],
        viewer_activity: Optional[ActivityType],
        connected_user_ids: Set[UUID],
        viewer_interests: List[str],
        now: Optional[datetime] = None,
    ) -> float:
        act_score = cls.calculate_activity_score(post.activity_type, viewer_activity)
        conn_score = cls.calculate_connection_score(post.author_id, connected_user_ids)
        int_score = cls.calculate_interest_score(
            viewer_interests,
            author_profile.interests if author_profile else None,
        )
        rec_score = cls.calculate_recency_score(post.created_at, now)

        return act_score + conn_score + int_score + rec_score

    @staticmethod
    def apply_author_diversity(
        items: List[dict],
        max_consecutive: int = 2,
    ) -> List[dict]:
        """
        Prevents more than `max_consecutive` posts from the same author in a row
        whenever an alternative author is available in the candidate pool.
        Each item is expected to have an 'author_id' key.
        """
        if len(items) <= max_consecutive:
            return items

        result: List[dict] = []
        pool = list(items)

        while pool:
            # Look at the tail of result to count consecutive posts by the same author
            current_author = None
            consecutive_count = 0
            if result:
                current_author = result[-1].get("author_id")
                for item in reversed(result):
                    if item.get("author_id") == current_author:
                        consecutive_count += 1
                    else:
                        break

            if consecutive_count >= max_consecutive:
                # Find the first item in pool with a different author
                alt_idx = -1
                for idx, candidate in enumerate(pool):
                    if candidate.get("author_id") != current_author:
                        alt_idx = idx
                        break

                if alt_idx != -1:
                    result.append(pool.pop(alt_idx))
                else:
                    # No alternative authors left; append the remaining items
                    result.append(pool.pop(0))
            else:
                result.append(pool.pop(0))

        return result
