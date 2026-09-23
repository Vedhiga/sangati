import logging
from typing import List, Optional
from uuid import UUID
from sqlalchemy import or_, and_, func, select
from sqlalchemy.orm import Session

from app.models.conversation import Conversation, ConversationParticipant, Message
from app.models.connection import Connection, ConnectionStatus
from app.models.profile import Profile
from app.models.activity import UserActivity
from app.schemas.conversation import (
    MessageCreate,
    MessageResponse,
    MessagesListResponse,
    MessagePreview,
    ConversationItemResponse,
    ConversationsListResponse,
    ConversationDetailResponse,
    GroupConversationCreate,
)
from app.services.connection_service import _build_public_user
from app.services.profile_service import ProfileService
from app.core.errors import (
    NotConnectedException,
    SelfConversationException,
    ProfileNotFoundException,
    ConversationNotFoundException,
    UnauthorizedConversationActionException,
)
from app.models.notification import Notification, NotificationType
from app.services.notification_service import NotificationService

logger = logging.getLogger("sidequest.services.conversation")


class ConversationService:
    @staticmethod
    def get_or_create_conversation(
        db: Session,
        current_user_id: UUID,
        target_user_id: UUID,
    ) -> ConversationDetailResponse:
        """
        Start or retrieve an existing 1-to-1 conversation between two connected users.
        Enforces:
        - Cannot message self.
        - Must have an ACCEPTED mutual connection.
        - Exactly one conversation exists per user pair (no duplicates).
        """
        if current_user_id == target_user_id:
            raise SelfConversationException("You cannot start a conversation with yourself.")

        target_profile = ProfileService.get_by_user_id(db, target_user_id)
        if not target_profile:
            raise ProfileNotFoundException("Target user not found.")

        # Verify accepted mutual connection
        conn = (
            db.query(Connection)
            .filter(
                or_(
                    and_(Connection.requester_id == current_user_id, Connection.receiver_id == target_user_id),
                    and_(Connection.requester_id == target_user_id, Connection.receiver_id == current_user_id),
                ),
                Connection.status == ConnectionStatus.ACCEPTED.value,
            )
            .first()
        )
        if not conn:
            raise NotConnectedException("You can only message users you are connected with.")

        # Search for existing 1-to-1 conversation containing both users
        user_convos = (
            select(ConversationParticipant.conversation_id)
            .filter(ConversationParticipant.user_id == current_user_id)
        )
        existing_convo_ids = (
            db.query(ConversationParticipant.conversation_id)
            .filter(
                ConversationParticipant.conversation_id.in_(user_convos),
                ConversationParticipant.user_id == target_user_id,
            )
            .all()
        )
        
        existing_convo_id = None
        for cid in [c[0] for c in existing_convo_ids]:
            c_obj = db.query(Conversation).filter(Conversation.id == cid).first()
            if c_obj and not c_obj.is_group:
                existing_convo_id = c_obj.id
                break

        if existing_convo_id:
            convo = db.query(Conversation).filter(Conversation.id == existing_convo_id).first()
            logger.info("Found existing conversation %s between %s and %s", convo.id, current_user_id, target_user_id)
        else:
            convo = Conversation(is_group=False)
            db.add(convo)
            db.flush()

            p1 = ConversationParticipant(conversation_id=convo.id, user_id=current_user_id)
            p2 = ConversationParticipant(conversation_id=convo.id, user_id=target_user_id)
            db.add_all([p1, p2])
            db.commit()
            db.refresh(convo)
            logger.info("Created new 1-to-1 conversation %s between %s and %s", convo.id, current_user_id, target_user_id)

        target_act = db.query(UserActivity).filter(UserActivity.user_id == target_user_id).first()
        act_type = target_act.activity_type if target_act else None
        other_public = _build_public_user(target_profile, act_type)

        return ConversationDetailResponse(
            id=convo.id,
            title=convo.title,
            is_group=convo.is_group,
            other_user=other_public,
            participants=[other_public],
            created_at=convo.created_at,
            last_message_at=convo.last_message_at,
        )

    @staticmethod
    def create_group_conversation(
        db: Session,
        current_user_id: UUID,
        data: GroupConversationCreate,
    ) -> ConversationDetailResponse:
        """
        Start a small group conversation between connected users.
        Enforces:
        - Target user IDs must be unique and excluding current_user_id.
        - EVERY target user ID must have an ACCEPTED mutual connection with current_user_id.
        - Creates a group conversation and adds all participants.
        """
        target_ids = list(set([uid for uid in data.participant_user_ids if uid != current_user_id]))
        if not target_ids:
            raise SelfConversationException("You must select at least one other connected user for a group conversation.")

        # Verify all targets are connected
        for tid in target_ids:
            target_profile = ProfileService.get_by_user_id(db, tid)
            if not target_profile:
                raise ProfileNotFoundException("One or more selected users were not found.")

            conn = (
                db.query(Connection)
                .filter(
                    or_(
                        and_(Connection.requester_id == current_user_id, Connection.receiver_id == tid),
                        and_(Connection.requester_id == tid, Connection.receiver_id == current_user_id),
                    ),
                    Connection.status == ConnectionStatus.ACCEPTED.value,
                )
                .first()
            )
            if not conn:
                raise NotConnectedException("You can only create group conversations with users you are connected to.")

        convo_title = data.title.strip() if data.title and data.title.strip() else None
        convo = Conversation(title=convo_title, is_group=True)
        db.add(convo)
        db.flush()

        all_user_ids = [current_user_id] + target_ids
        participants = [ConversationParticipant(conversation_id=convo.id, user_id=uid) for uid in all_user_ids]
        db.add_all(participants)
        db.commit()
        db.refresh(convo)

        # Notify participants
        creator_prof = ProfileService.get_by_user_id(db, current_user_id)
        creator_name = creator_prof.display_name if creator_prof else "Someone"
        for tid in target_ids:
            NotificationService.create_notification(
                db=db,
                recipient_id=tid,
                actor_id=current_user_id,
                type=NotificationType.NEW_MESSAGE,
                title="Added to Group Conversation",
                message=f"{creator_name} added you to a group conversation.",
                reference_id=convo.id,
            )

        return ConversationService.get_conversation_detail(db, convo.id, current_user_id)

    @staticmethod
    def get_user_conversations(
        db: Session,
        current_user_id: UUID,
        limit: int = 20,
        offset: int = 0,
    ) -> ConversationsListResponse:
        """
        List all conversations for the authenticated user, ordered by last_message_at DESC.
        """
        user_convo_ids = (
            db.query(ConversationParticipant.conversation_id)
            .filter(ConversationParticipant.user_id == current_user_id)
            .all()
        )
        convo_ids = [c[0] for c in user_convo_ids]

        if not convo_ids:
            return ConversationsListResponse(conversations=[], total=0)

        total = len(convo_ids)
        convos = (
            db.query(Conversation)
            .filter(Conversation.id.in_(convo_ids))
            .order_by(
                func.coalesce(Conversation.last_message_at, Conversation.created_at).desc()
            )
            .offset(offset)
            .limit(limit)
            .all()
        )

        results: List[ConversationItemResponse] = []
        for c in convos:
            other_parts = (
                db.query(ConversationParticipant)
                .filter(
                    ConversationParticipant.conversation_id == c.id,
                    ConversationParticipant.user_id != current_user_id,
                )
                .all()
            )
            
            part_public_users = []
            for op in other_parts:
                op_prof = ProfileService.get_by_user_id(db, op.user_id)
                if op_prof:
                    op_act = db.query(UserActivity).filter(UserActivity.user_id == op.user_id).first()
                    act_type = op_act.activity_type if op_act else None
                    part_public_users.append(_build_public_user(op_prof, act_type))

            if not c.is_group and (c.conversation_type or "DIRECT") != "ACTIVITY" and not part_public_users:
                continue

            other_user = part_public_users[0] if part_public_users else None

            latest_msg = (
                db.query(Message)
                .filter(Message.conversation_id == c.id)
                .order_by(Message.created_at.desc())
                .first()
            )

            msg_preview = None
            if latest_msg:
                msg_preview = MessagePreview(
                    id=latest_msg.id,
                    sender_id=latest_msg.sender_id,
                    content=latest_msg.content,
                    created_at=latest_msg.created_at,
                )

            results.append(
                ConversationItemResponse(
                    id=c.id,
                    title=c.title,
                    is_group=c.is_group,
                    conversation_type=c.conversation_type or ("GROUP" if c.is_group else "DIRECT"),
                    activity_id=c.activity_id,
                    status=c.status or "ACTIVE",
                    other_user=other_user,
                    participants=part_public_users,
                    last_message=msg_preview,
                    created_at=c.created_at,
                    last_message_at=c.last_message_at,
                )
            )

        return ConversationsListResponse(conversations=results, total=total)

    @staticmethod
    def get_conversation_detail(
        db: Session,
        conversation_id: UUID,
        current_user_id: UUID,
    ) -> ConversationDetailResponse:
        """
        Get details for a conversation, verifying participant authorization.
        """
        convo = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if not convo:
            raise ConversationNotFoundException("Conversation not found.")

        viewer_part = (
            db.query(ConversationParticipant)
            .filter(
                ConversationParticipant.conversation_id == conversation_id,
                ConversationParticipant.user_id == current_user_id,
            )
            .first()
        )
        if not viewer_part:
            raise UnauthorizedConversationActionException("You are not a participant in this conversation.")

        other_parts = (
            db.query(ConversationParticipant)
            .filter(
                ConversationParticipant.conversation_id == conversation_id,
                ConversationParticipant.user_id != current_user_id,
            )
            .all()
        )
        
        part_public_users = []
        for op in other_parts:
            op_prof = ProfileService.get_by_user_id(db, op.user_id)
            if op_prof:
                op_act = db.query(UserActivity).filter(UserActivity.user_id == op.user_id).first()
                act_type = op_act.activity_type if op_act else None
                part_public_users.append(_build_public_user(op_prof, act_type))

        other_user = part_public_users[0] if part_public_users else None

        return ConversationDetailResponse(
            id=convo.id,
            title=convo.title,
            is_group=convo.is_group,
            conversation_type=convo.conversation_type or ("GROUP" if convo.is_group else "DIRECT"),
            activity_id=convo.activity_id,
            status=convo.status or "ACTIVE",
            other_user=other_user,
            participants=part_public_users,
            created_at=convo.created_at,
            last_message_at=convo.last_message_at,
        )

    @staticmethod
    def get_conversation_messages(
        db: Session,
        conversation_id: UUID,
        current_user_id: UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> MessagesListResponse:
        """
        Retrieve messages for a conversation chronologically (created_at ASC).
        Strictly verifies user is a participant.
        """
        convo = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if not convo:
            raise ConversationNotFoundException("Conversation not found.")

        participant = (
            db.query(ConversationParticipant)
            .filter(
                ConversationParticipant.conversation_id == conversation_id,
                ConversationParticipant.user_id == current_user_id,
            )
            .first()
        )
        if not participant:
            raise UnauthorizedConversationActionException("You are not a participant in this conversation.")

        query = db.query(Message).filter(Message.conversation_id == conversation_id)
        total = query.count()
        messages = (
            query.order_by(Message.created_at.asc())
            .offset(offset)
            .limit(limit)
            .all()
        )

        sender_ids = list({m.sender_id for m in messages})
        sender_profiles = db.query(Profile).filter(Profile.user_id.in_(sender_ids)).all() if sender_ids else []
        profile_map = {p.user_id: p for p in sender_profiles}

        user_acts = db.query(UserActivity).filter(UserActivity.user_id.in_(sender_ids)).all() if sender_ids else []
        act_map = {ua.user_id: ua.activity_type for ua in user_acts}

        message_responses = []
        for m in messages:
            prof = profile_map.get(m.sender_id)
            sender_public = _build_public_user(prof, act_map.get(m.sender_id)) if prof else None
            message_responses.append(
                MessageResponse(
                    id=m.id,
                    conversation_id=m.conversation_id,
                    sender_id=m.sender_id,
                    sender=sender_public,
                    content=m.content,
                    created_at=m.created_at,
                )
            )

        return MessagesListResponse(
            messages=message_responses,
            total=total,
            limit=limit,
            offset=offset,
        )

    @staticmethod
    def send_message(
        db: Session,
        conversation_id: UUID,
        current_user_id: UUID,
        data: MessageCreate,
    ) -> MessageResponse:
        """
        Send a message into a conversation.
        Strictly enforces:
        - Authenticated user must belong to conversation.
        - sender_id derived exclusively from authenticated user.
        - Updates conversation.last_message_at.
        - Prevents sending messages if conversation is ARCHIVED or associated activity is ENDED.
        """
        convo = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if not convo:
            raise ConversationNotFoundException("Conversation not found.")

        if (convo.status or "ACTIVE") == "ARCHIVED":
            raise UnauthorizedConversationActionException("This conversation has ended and is read-only.")

        if convo.activity_id or convo.conversation_type == "ACTIVITY":
            from app.models.activity_system import Activity, ActivityStatus
            act = db.query(Activity).filter(Activity.id == convo.activity_id).first() if convo.activity_id else None
            if act and act.status == ActivityStatus.ENDED:
                raise UnauthorizedConversationActionException("This activity has ended. New messages cannot be sent.")

        participant = (
            db.query(ConversationParticipant)
            .filter(
                ConversationParticipant.conversation_id == conversation_id,
                ConversationParticipant.user_id == current_user_id,
            )
            .first()
        )
        if not participant:
            raise UnauthorizedConversationActionException("You are not a participant in this conversation.")

        msg = Message(
            conversation_id=conversation_id,
            sender_id=current_user_id,
            content=data.content,
        )
        db.add(msg)
        db.flush()

        convo.last_message_at = msg.created_at

        # Notify all other participants about the new message
        other_participants = (
            db.query(ConversationParticipant)
            .filter(
                ConversationParticipant.conversation_id == conversation_id,
                ConversationParticipant.user_id != current_user_id,
            )
            .all()
        )
        
        sender_prof = db.query(Profile).filter(Profile.user_id == current_user_id).first()
        sender_name = sender_prof.display_name if sender_prof else "Someone"
        
        for op in other_participants:
            NotificationService.create_notification(
                db=db,
                recipient_id=op.user_id,
                actor_id=current_user_id,
                type=NotificationType.NEW_MESSAGE,
                title="New Message",
                message=f"You have a new message from {sender_name}.",
                reference_id=conversation_id,
            )

        db.commit()
        db.refresh(msg)

        logger.info("User %s sent message %s in conversation %s", current_user_id, msg.id, conversation_id)

        sender_act = db.query(UserActivity).filter(UserActivity.user_id == current_user_id).first()
        sender_public = _build_public_user(sender_prof, sender_act.activity_type if sender_act else None) if sender_prof else None

        return MessageResponse(
            id=msg.id,
            conversation_id=msg.conversation_id,
            sender_id=msg.sender_id,
            sender=sender_public,
            content=msg.content,
            created_at=msg.created_at,
        )

    @staticmethod
    def get_unread_count(db: Session, current_user_id: UUID) -> int:
        """
        Count unread NEW_MESSAGE notifications for the authenticated user.
        """
        count = (
            db.query(Notification)
            .filter(
                Notification.recipient_id == current_user_id,
                Notification.type == NotificationType.NEW_MESSAGE,
                Notification.is_read == False,
            )
            .count()
        )
        return count

    @staticmethod
    def mark_conversation_read(db: Session, conversation_id: UUID, current_user_id: UUID) -> None:
        """
        Mark all NEW_MESSAGE notifications for a given conversation_id as read for current user.
        """
        db.query(Notification).filter(
            Notification.recipient_id == current_user_id,
            Notification.type == NotificationType.NEW_MESSAGE,
            Notification.reference_id == conversation_id,
            Notification.is_read == False,
        ).update({"is_read": True}, synchronize_session=False)
        db.commit()

