import logging
from typing import List, Optional, Union
from uuid import UUID
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import or_, and_
from sqlalchemy.orm import Session

from app.models.activity_system import (
    Activity,
    ActivityParticipant,
    ActivitySession,
    ActivityInvitation,
    ActivityStatus,
    ParticipantStatus,
    SessionStatus,
    InvitationStatus,
)
from app.models.profile import Profile
from app.models.conversation import Conversation, ConversationParticipant
from app.models.connection import Connection, ConnectionStatus
from app.models.notification import Notification, NotificationType
from app.schemas.activity import safe_parse_activity_type
from app.schemas.activity_system import (
    PublicActivityResponse,
    ParticipantActivityResponse,
    CreateActivityRequest,
    UpdateActivityRequest,
    ActivityHostPublic,
    ActivityParticipantPublic,
    ActivitySessionResponse,
)

logger = logging.getLogger("sidequest.services.activity_system")


class ActivitySystemService:
    @staticmethod
    def _build_host_public(profile: Optional[Profile], user_id: UUID) -> ActivityHostPublic:
        if profile:
            return ActivityHostPublic(
                id=user_id,
                name=profile.display_name or "Host",
                username=profile.username or str(user_id)[:8],
                avatar_url=profile.avatar_url,
            )
        return ActivityHostPublic(
            id=user_id,
            name="Community Host",
            username="host",
            avatar_url=None,
        )

    @staticmethod
    def _build_participants_public(
        db: Session, activity_id: UUID
    ) -> List[ActivityParticipantPublic]:
        participants = (
            db.query(ActivityParticipant)
            .filter(
                ActivityParticipant.activity_id == activity_id,
                ActivityParticipant.status == ParticipantStatus.JOINED.value,
            )
            .all()
        )
        if not participants:
            return []

        user_ids = [p.user_id for p in participants]
        profiles = db.query(Profile).filter(Profile.user_id.in_(user_ids)).all()
        profile_map = {p.user_id: p for p in profiles}

        result = []
        for p in participants:
            prof = profile_map.get(p.user_id)
            name = prof.display_name if prof else "Participant"
            username = prof.username if prof else str(p.user_id)[:8]
            avatar = prof.avatar_url if prof else None
            result.append(
                ActivityParticipantPublic(
                    id=p.user_id,
                    name=name,
                    username=username,
                    avatar_url=avatar,
                    joined_at=p.joined_at,
                )
            )
        return result

    @staticmethod
    def get_activities(
        db: Session,
        current_user_id: UUID,
        intent_filter: Optional[str] = None,
    ) -> List[PublicActivityResponse]:
        query = db.query(Activity).filter(Activity.status != ActivityStatus.ENDED.value)
        if intent_filter and intent_filter != "ALL":
            query = query.filter(Activity.intent_type == intent_filter.upper())

        activities = query.order_by(Activity.created_at.desc()).all()
        if not activities:
            return []

        host_ids = list({a.host_user_id for a in activities})
        host_profiles = db.query(Profile).filter(Profile.user_id.in_(host_ids)).all()
        host_map = {p.user_id: p for p in host_profiles}

        # Batch load caller's joined activity IDs
        activity_ids = [a.id for a in activities]
        joined_records = (
            db.query(ActivityParticipant.activity_id)
            .filter(
                ActivityParticipant.activity_id.in_(activity_ids),
                ActivityParticipant.user_id == current_user_id,
                ActivityParticipant.status == ParticipantStatus.JOINED.value,
            )
            .all()
        )
        joined_set = {r[0] for r in joined_records}

        result = []
        for act in activities:
            is_host = act.host_user_id == current_user_id
            is_participant = is_host or (act.id in joined_set)
            participants = ActivitySystemService._build_participants_public(db, act.id)

            result.append(
                PublicActivityResponse(
                    id=act.id,
                    intent=safe_parse_activity_type(act.intent_type),
                    title=act.title,
                    description=act.description,
                    activity_type=act.activity_type,
                    recurrence_type=act.activity_type,
                    frequency=act.frequency,
                    day_of_week=act.day_of_week,
                    schedule_day=act.day_of_week,
                    time_of_day=act.time_of_day,
                    schedule_time=act.time_of_day,
                    timezone=act.timezone or "IST (UTC+5:30)",
                    duration_minutes=act.duration_minutes,
                    max_participants=act.max_participants,
                    participant_limit=act.max_participants,
                    participant_count=len(participants),
                    status=act.status,
                    conversation_id=getattr(act, "conversation_id", None),
                    host=ActivitySystemService._build_host_public(host_map.get(act.host_user_id), act.host_user_id),
                    created_at=act.created_at or datetime.now(timezone.utc),
                    public_participants=participants,
                    is_participant=is_participant,
                    is_host=is_host,
                )
            )
        return result

    @staticmethod
    def get_activity_detail(
        db: Session,
        activity_id: UUID,
        current_user_id: UUID,
    ) -> Union[ParticipantActivityResponse, PublicActivityResponse]:
        act = db.query(Activity).filter(Activity.id == activity_id).first()
        if not act:
            raise HTTPException(status_code=404, detail="Activity not found")

        host_prof = db.query(Profile).filter(Profile.user_id == act.host_user_id).first()
        host_public = ActivitySystemService._build_host_public(host_prof, act.host_user_id)
        participants = ActivitySystemService._build_participants_public(db, act.id)

        is_host = act.host_user_id == current_user_id
        is_joined = any(p.id == current_user_id for p in participants)
        is_participant = is_host or is_joined

        # Authorization Boundary: Only return private meeting details if caller is host or participant
        if is_participant:
            # Fetch sessions
            sessions = (
                db.query(ActivitySession)
                .filter(ActivitySession.activity_id == act.id)
                .order_by(ActivitySession.created_at.desc())
                .all()
            )
            upcoming = None
            past = []
            for sess in sessions:
                sess_resp = ActivitySessionResponse(
                    id=sess.id,
                    activity_id=sess.activity_id,
                    session_number=sess.session_number,
                    title=sess.title,
                    scheduled_at=sess.scheduled_at,
                    duration_minutes=sess.duration_minutes,
                    state=sess.status,
                )
                if sess.status == SessionStatus.UPCOMING.value and not upcoming:
                    upcoming = sess_resp
                else:
                    past.append(sess_resp)

            if not upcoming and act.status == ActivityStatus.ACTIVE.value:
                upcoming = ActivitySessionResponse(
                    id=act.id,
                    activity_id=act.id,
                    session_number=1,
                    title="Next Scheduled Occurrence",
                    scheduled_at=f"{act.day_of_week or 'Saturdays'} · {act.time_of_day or '8:00 PM'}",
                    duration_minutes=act.duration_minutes,
                    state="UPCOMING",
                )

            return ParticipantActivityResponse(
                id=act.id,
                intent=safe_parse_activity_type(act.intent_type),
                title=act.title,
                description=act.description,
                activity_type=act.activity_type,
                recurrence_type=act.activity_type,
                frequency=act.frequency,
                day_of_week=act.day_of_week,
                schedule_day=act.day_of_week,
                time_of_day=act.time_of_day,
                schedule_time=act.time_of_day,
                timezone=act.timezone or "IST (UTC+5:30)",
                duration_minutes=act.duration_minutes,
                max_participants=act.max_participants,
                participant_limit=act.max_participants,
                participant_count=len(participants),
                status=act.status,
                conversation_id=getattr(act, "conversation_id", None),
                host=host_public,
                created_at=act.created_at or datetime.now(timezone.utc),
                public_participants=participants,
                is_participant=True,
                is_host=is_host,
                meeting_platform=act.meeting_platform,
                meeting_url=act.meeting_url,
                private_notes=act.private_notes,
                upcoming_session=upcoming,
                past_sessions=past,
                chat_messages=[],
            )

        # Public view for non-participants (strips meeting_url & private notes)
        return PublicActivityResponse(
            id=act.id,
            intent=safe_parse_activity_type(act.intent_type),
            title=act.title,
            description=act.description,
            activity_type=act.activity_type,
            recurrence_type=act.activity_type,
            frequency=act.frequency,
            day_of_week=act.day_of_week,
            schedule_day=act.day_of_week,
            time_of_day=act.time_of_day,
            schedule_time=act.time_of_day,
            timezone=act.timezone or "IST (UTC+5:30)",
            duration_minutes=act.duration_minutes,
            max_participants=act.max_participants,
            participant_limit=act.max_participants,
            participant_count=len(participants),
            status=act.status,
            conversation_id=getattr(act, "conversation_id", None),
            host=host_public,
            created_at=act.created_at or datetime.now(timezone.utc),
            public_participants=participants,
            is_participant=False,
            is_host=False,
        )

    @staticmethod
    def create_activity(
        db: Session,
        host_id: UUID,
        req: CreateActivityRequest,
    ) -> ParticipantActivityResponse:
        act = Activity(
            host_user_id=host_id,
            intent_type=req.intent.value,
            title=req.title.strip(),
            description=req.description.strip(),
            activity_type=req.activity_type,
            frequency=req.frequency,
            day_of_week=req.day_of_week,
            time_of_day=req.time_of_day,
            timezone=req.timezone or "IST (UTC+5:30)",
            duration_minutes=req.duration_minutes,
            max_participants=req.max_participants,
            meeting_platform=req.meeting_platform,
            meeting_url=req.meeting_url.strip(),
            private_notes=req.private_notes.strip() if req.private_notes else None,
            status=ActivityStatus.ACTIVE.value,
        )
        db.add(act)
        db.flush()

        # Create associated activity group conversation
        convo = Conversation(
            title=f"Activity: {req.title.strip()}",
            is_group=True,
            conversation_type="ACTIVITY",
            activity_id=act.id,
            status="ACTIVE",
        )
        db.add(convo)
        db.flush()

        act.conversation_id = convo.id

        # Add host as first participant in activity & conversation
        host_part = ActivityParticipant(
            activity_id=act.id,
            user_id=host_id,
            status=ParticipantStatus.JOINED.value,
        )
        db.add(host_part)

        convo_part = ConversationParticipant(
            conversation_id=convo.id,
            user_id=host_id,
        )
        db.add(convo_part)

        # Create initial upcoming session
        initial_sess = ActivitySession(
            activity_id=act.id,
            session_number=1,
            title="Session #1",
            scheduled_at=f"{req.day_of_week or 'Upcoming'} · {req.time_of_day or 'Scheduled'}",
            duration_minutes=req.duration_minutes,
            status=SessionStatus.UPCOMING.value,
        )
        db.add(initial_sess)
        db.commit()

        return ActivitySystemService.get_activity_detail(db, act.id, host_id)

    @staticmethod
    def join_activity(
        db: Session,
        activity_id: UUID,
        user_id: UUID,
    ) -> ParticipantActivityResponse:
        act = db.query(Activity).filter(Activity.id == activity_id).first()
        if not act:
            raise HTTPException(status_code=404, detail="Activity not found")

        if act.status != ActivityStatus.ACTIVE.value:
            raise HTTPException(status_code=400, detail="Cannot join a paused or ended activity")

        # Check existing participant record
        existing = (
            db.query(ActivityParticipant)
            .filter(
                ActivityParticipant.activity_id == activity_id,
                ActivityParticipant.user_id == user_id,
            )
            .first()
        )

        current_count = (
            db.query(ActivityParticipant)
            .filter(
                ActivityParticipant.activity_id == activity_id,
                ActivityParticipant.status == ParticipantStatus.JOINED.value,
            )
            .count()
        )

        if not existing:
            if current_count >= act.max_participants:
                raise HTTPException(status_code=400, detail="Activity has reached maximum participant limit")
            new_part = ActivityParticipant(
                activity_id=activity_id,
                user_id=user_id,
                status=ParticipantStatus.JOINED.value,
            )
            db.add(new_part)
        elif existing.status != ParticipantStatus.JOINED.value:
            if current_count >= act.max_participants:
                raise HTTPException(status_code=400, detail="Activity has reached maximum participant limit")
            existing.status = ParticipantStatus.JOINED.value
            existing.left_at = None

        # Ensure conversation exists and sync user as conversation participant
        convo = None
        convo_id = getattr(act, "conversation_id", None)
        if convo_id:
            convo = db.query(Conversation).filter(Conversation.id == convo_id).first()

        if not convo:
            convo = Conversation(
                title=f"Activity: {act.title}",
                is_group=True,
                conversation_type="ACTIVITY",
                activity_id=act.id,
                status="ACTIVE",
            )
            db.add(convo)
            db.flush()
            if hasattr(act, "conversation_id"):
                act.conversation_id = convo.id

        convo_part = (
            db.query(ConversationParticipant)
            .filter(
                ConversationParticipant.conversation_id == convo.id,
                ConversationParticipant.user_id == user_id,
            )
            .first()
        )
        if not convo_part:
            db.add(ConversationParticipant(conversation_id=convo.id, user_id=user_id))

        db.commit()
        return ActivitySystemService.get_activity_detail(db, activity_id, user_id)

    @staticmethod
    def leave_activity(
        db: Session,
        activity_id: UUID,
        user_id: UUID,
    ) -> PublicActivityResponse:
        act = db.query(Activity).filter(Activity.id == activity_id).first()
        if not act:
            raise HTTPException(status_code=404, detail="Activity not found")

        if act.host_user_id == user_id:
            raise HTTPException(status_code=400, detail="Host cannot leave their own activity. End activity instead.")

        part = (
            db.query(ActivityParticipant)
            .filter(
                ActivityParticipant.activity_id == activity_id,
                ActivityParticipant.user_id == user_id,
                ActivityParticipant.status == ParticipantStatus.JOINED.value,
            )
            .first()
        )
        if part:
            part.status = ParticipantStatus.LEFT.value
            part.left_at = datetime.now(timezone.utc)

            # Sync: Remove from conversation participants so user loses active sending privileges
            convo_id = getattr(act, "conversation_id", None)
            if convo_id:
                cp = (
                    db.query(ConversationParticipant)
                    .filter(
                        ConversationParticipant.conversation_id == convo_id,
                        ConversationParticipant.user_id == user_id,
                    )
                    .first()
                )
                if cp:
                    db.delete(cp)

            db.commit()

        return ActivitySystemService.get_activity_detail(db, activity_id, user_id)

    @staticmethod
    def pause_activity(
        db: Session,
        activity_id: UUID,
        user_id: UUID,
    ) -> ParticipantActivityResponse:
        act = db.query(Activity).filter(Activity.id == activity_id).first()
        if not act:
            raise HTTPException(status_code=404, detail="Activity not found")

        if act.host_user_id != user_id:
            raise HTTPException(status_code=430, detail="Only the host can pause this activity")

        act.status = ActivityStatus.PAUSED.value
        db.commit()
        return ActivitySystemService.get_activity_detail(db, activity_id, user_id)

    @staticmethod
    def resume_activity(
        db: Session,
        activity_id: UUID,
        user_id: UUID,
    ) -> ParticipantActivityResponse:
        act = db.query(Activity).filter(Activity.id == activity_id).first()
        if not act:
            raise HTTPException(status_code=404, detail="Activity not found")

        if act.host_user_id != user_id:
            raise HTTPException(status_code=403, detail="Only the host can resume this activity")

        act.status = ActivityStatus.ACTIVE.value
        db.commit()
        return ActivitySystemService.get_activity_detail(db, activity_id, user_id)

    @staticmethod
    def end_activity(
        db: Session,
        activity_id: UUID,
        user_id: UUID,
    ) -> ParticipantActivityResponse:
        act = db.query(Activity).filter(Activity.id == activity_id).first()
        if not act:
            raise HTTPException(status_code=404, detail="Activity not found")

        if act.host_user_id != user_id:
            raise HTTPException(status_code=403, detail="Only the host can end this activity")

        act.status = ActivityStatus.ENDED.value
        act.ended_at = datetime.now(timezone.utc)

        # Archive conversation (read-only historical access preserved)
        if act.conversation_id:
            convo = db.query(Conversation).filter(Conversation.id == act.conversation_id).first()
            if convo:
                convo.status = "ARCHIVED"

        db.commit()
        return ActivitySystemService.get_activity_detail(db, activity_id, user_id)

    @staticmethod
    def invite_connections(
        db: Session,
        activity_id: UUID,
        host_id: UUID,
        connection_ids: List[UUID],
    ) -> int:
        act = db.query(Activity).filter(Activity.id == activity_id).first()
        if not act:
            raise HTTPException(status_code=404, detail="Activity not found")

        if act.host_user_id != host_id:
            raise HTTPException(status_code=403, detail="Only the host can invite connections")

        # Verify target users are accepted connections
        accepted_conns = (
            db.query(Connection)
            .filter(
                or_(
                    and_(Connection.requester_id == host_id, Connection.receiver_id.in_(connection_ids)),
                    and_(Connection.receiver_id == host_id, Connection.requester_id.in_(connection_ids)),
                ),
                Connection.status == ConnectionStatus.ACCEPTED.value,
            )
            .all()
        )
        valid_invited_ids = {
            c.receiver_id if c.requester_id == host_id else c.requester_id
            for c in accepted_conns
        }

        invited_count = 0
        host_profile = db.query(Profile).filter(Profile.user_id == host_id).first()
        host_name = host_profile.display_name if host_profile else "Someone"

        for invited_id in valid_invited_ids:
            existing = (
                db.query(ActivityInvitation)
                .filter(
                    ActivityInvitation.activity_id == activity_id,
                    ActivityInvitation.invited_user_id == invited_id,
                )
                .first()
            )
            if not existing:
                inv = ActivityInvitation(
                    activity_id=activity_id,
                    invited_user_id=invited_id,
                    invited_by_user_id=host_id,
                    status=InvitationStatus.PENDING.value,
                )
                db.add(inv)
                invited_count += 1

                # Send Notification
                notif = Notification(
                    recipient_id=invited_id,
                    actor_id=host_id,
                    type="ACTIVITY_INVITATION",
                    title="Activity Invitation",
                    message=f"{host_name} invited you to join '{act.title}'",
                    reference_id=activity_id,
                )
                db.add(notif)

        db.commit()
        return invited_count
