import json
import logging
from typing import List, Optional, Tuple
from uuid import UUID
from sqlalchemy.orm import Session

from app.models.profile import Profile
from app.models.activity import UserActivity
from app.schemas.discovery import DiscoveryPerson, DiscoveryResponse
from app.schemas.activity import ActivityType, safe_parse_activity_type
from app.services.activity_service import ActivityService
from app.services.profile_service import ProfileService

logger = logging.getLogger("sidequest.services.discovery")

ACTIVITY_VERBS = {
    "BUILD": "building",
    "LEARN": "learning",
    "CONVERSATION": "open to conversation",
    "EXPLORE": "exploring",
}


def _parse_interests(raw: Optional[str]) -> List[str]:
    if not raw:
        return []
    try:
        data = json.loads(raw)
        if isinstance(data, list):
            return [str(x).strip() for x in data if str(x).strip()]
    except Exception:
        pass
    return [s.strip() for s in raw.split(",") if s.strip()]


class DiscoveryService:
    @staticmethod
    def get_discovery_feed(
        db: Session,
        current_user_id: UUID,
        activity_filter: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> DiscoveryResponse:
        """
        Discover people based on activity matching and shared interests.
        Strictly excludes the current user.
        Supports filtering by specific activity or exploring all.
        """
        # 1. Get current user's profile and active activity
        current_user_profile = ProfileService.get_by_user_id(db, current_user_id)
        current_user_activity_record = ActivityService.get_by_user_id(db, current_user_id)
        current_user_activity: Optional[str] = (
            current_user_activity_record.activity_type
            if current_user_activity_record
            else None
        )

        user_interests_set = set(
            interest.lower()
            for interest in _parse_interests(
                current_user_profile.interests if current_user_profile else None
            )
        )

        # 1.5 Exclude users already connected (ACCEPTED status in either direction)
        from app.models.connection import Connection, ConnectionStatus
        from sqlalchemy import or_

        accepted_conns = (
            db.query(Connection)
            .filter(
                or_(Connection.requester_id == current_user_id, Connection.receiver_id == current_user_id),
                Connection.status == ConnectionStatus.ACCEPTED.value,
            )
            .all()
        )
        connected_user_ids = {
            c.receiver_id if c.requester_id == current_user_id else c.requester_id
            for c in accepted_conns
        }

        # 2. Query candidates excluding current user and already connected users
        query = (
            db.query(Profile, UserActivity.activity_type)
            .outerjoin(UserActivity, Profile.user_id == UserActivity.user_id)
            .filter(Profile.user_id != current_user_id)
        )
        if connected_user_ids:
            query = query.filter(Profile.user_id.notin_(connected_user_ids))

        # 3. Apply activity filter if provided and not ALL
        normalized_filter = activity_filter.strip().upper() if activity_filter else None
        if normalized_filter and normalized_filter != "ALL":
            query = query.filter(UserActivity.activity_type == normalized_filter)

        results: List[Tuple[Profile, Optional[str]]] = query.all()

        # 4. Score and build DiscoveryPerson objects
        scored_candidates = []
        for profile, cand_activity in results:
            cand_interests = _parse_interests(profile.interests)
            cand_interests_lower = {i.lower() for i in cand_interests}
            shared_interests = user_interests_set.intersection(cand_interests_lower)

            # Score calculation
            score = 0
            if (
                current_user_activity
                and current_user_activity != "EXPLORE"
                and cand_activity == current_user_activity
            ):
                score += 100
            score += len(shared_interests) * 10
            if cand_activity:
                score += 1

            # Match reason explanation
            if (
                current_user_activity
                and cand_activity == current_user_activity
                and current_user_activity != "EXPLORE"
            ):
                verb = ACTIVITY_VERBS.get(cand_activity, cand_activity.lower())
                if shared_interests:
                    shared_sample = ", ".join(list(shared_interests)[:2])
                    match_reason = f"Also {verb} • Shared: {shared_sample}"
                else:
                    match_reason = f"Also {verb}"
            elif cand_activity and cand_activity in ACTIVITY_VERBS:
                verb = ACTIVITY_VERBS.get(cand_activity, cand_activity.lower())
                if shared_interests:
                    shared_sample = ", ".join(list(shared_interests)[:2])
                    match_reason = f"Currently {verb} • Shared: {shared_sample}"
                else:
                    match_reason = f"Currently {verb}"
            elif shared_interests:
                shared_sample = ", ".join(list(shared_interests)[:2])
                match_reason = f"Shared interests: {shared_sample}"
            else:
                match_reason = "Community member"

            activity_enum = safe_parse_activity_type(cand_activity) if cand_activity else None

            person = DiscoveryPerson(
                id=profile.id,
                user_id=profile.user_id,
                username=profile.username,
                display_name=profile.display_name,
                bio=profile.bio,
                avatar_url=profile.avatar_url,
                interests=cand_interests,
                activity=activity_enum,
                match_reason=match_reason,
            )
            scored_candidates.append((score, person))

        # Sort descending by score, then ascending by username for deterministic order
        scored_candidates.sort(key=lambda x: (-x[0], x[1].username))

        total = len(scored_candidates)
        paginated_people = [p for _, p in scored_candidates[offset : offset + limit]]

        # Resolve connection statuses for the candidates relative to current viewer
        if paginated_people:
            from app.services.connection_service import ConnectionService
            candidate_ids = [p.user_id for p in paginated_people]
            conn_map = ConnectionService.get_connection_status_map(db, current_user_id, candidate_ids)
            for p in paginated_people:
                if p.user_id in conn_map:
                    status, conn_id = conn_map[p.user_id]
                    p.connection_status = status
                    p.connection_id = conn_id

        current_activity_enum = safe_parse_activity_type(current_user_activity) if current_user_activity else None

        return DiscoveryResponse(
            people=paginated_people,
            total=total,
            current_user_activity=current_activity_enum,
        )
