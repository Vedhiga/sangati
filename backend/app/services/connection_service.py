import logging
from typing import Dict, List, Optional, Tuple
from uuid import UUID
from sqlalchemy import or_, and_, func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.connection import Connection, ConnectionStatus
from app.models.profile import Profile
from app.models.activity import UserActivity
from app.schemas.connection import (
    ConnectionResponse,
    ConnectionUserPublic,
    ConnectionRequestItem,
    IncomingRequestsResponse,
    ConnectedPersonItem,
    ConnectionsListResponse,
)
from app.schemas.discovery import PersonConnectionStatus
from app.schemas.activity import ActivityType
from app.services.profile_service import ProfileService
from app.services.discovery_service import _parse_interests
from app.core.errors import (
    SelfConnectionException,
    ProfileNotFoundException,
    ConnectionNotFoundException,
    AlreadyConnectedException,
    DuplicateConnectionRequestException,
    ReverseRequestExistsException,
    UnauthorizedConnectionActionException,
)
from app.models.notification import NotificationType
from app.services.notification_service import NotificationService

logger = logging.getLogger("sidequest.services.connection")


def _build_public_user(profile: Profile, activity_type: Optional[str]) -> ConnectionUserPublic:
    act_enum = None
    if activity_type:
        try:
            act_enum = ActivityType(activity_type)
        except ValueError:
            act_enum = None

    return ConnectionUserPublic(
        id=profile.id,
        user_id=profile.user_id,
        username=profile.username,
        display_name=profile.display_name,
        bio=profile.bio,
        avatar_url=profile.avatar_url,
        activity=act_enum,
        interests=_parse_interests(profile.interests),
    )


class ConnectionService:
    @staticmethod
    def send_request(db: Session, requester_id: UUID, target_user_id: UUID) -> ConnectionResponse:
        """
        Send a connection request from the authenticated requester to a target user.
        Enforces self-connection prevention, uniqueness, and reverse request rules.
        """
        if requester_id == target_user_id:
            raise SelfConnectionException("You cannot connect with yourself.")

        # Ensure target user exists
        target_profile = ProfileService.get_by_user_id(db, target_user_id)
        if not target_profile:
            raise ProfileNotFoundException("Target user profile was not found.")

        # Ensure requester has a profile
        requester_profile = ProfileService.get_by_user_id(db, requester_id)
        if not requester_profile:
            raise ProfileNotFoundException("Please complete your profile before connecting.")

        # Check existing connection between the two users in either direction
        existing = (
            db.query(Connection)
            .filter(
                or_(
                    and_(Connection.requester_id == requester_id, Connection.receiver_id == target_user_id),
                    and_(Connection.requester_id == target_user_id, Connection.receiver_id == requester_id),
                )
            )
            .first()
        )

        if existing:
            if existing.status == ConnectionStatus.ACCEPTED.value:
                raise AlreadyConnectedException("You are already connected with this person.")
            elif existing.status == ConnectionStatus.PENDING.value:
                if existing.requester_id == requester_id:
                    raise DuplicateConnectionRequestException("This request has already been sent.")
                else:
                    raise ReverseRequestExistsException(
                        "This person has already sent you a connection request. Check your incoming requests."
                    )
            elif existing.status == ConnectionStatus.REJECTED.value:
                # Clean reactivation of rejected request in the new direction
                existing.requester_id = requester_id
                existing.receiver_id = target_user_id
                existing.status = ConnectionStatus.PENDING.value
                existing.updated_at = func.now()

                req_prof = db.query(Profile).filter(Profile.user_id == requester_id).first()
                actor_name = req_prof.display_name if req_prof else "Someone"
                NotificationService.create_notification(
                    db=db,
                    recipient_id=target_user_id,
                    actor_id=requester_id,
                    type=NotificationType.CONNECTION_REQUEST,
                    title="Connection Request",
                    message=f"{actor_name} sent you a connection request.",
                    reference_id=existing.id,
                )

                db.commit()
                db.refresh(existing)
                return ConnectionResponse.model_validate(existing)

        # Create new pending connection
        connection = Connection(
            requester_id=requester_id,
            receiver_id=target_user_id,
            status=ConnectionStatus.PENDING.value,
        )

        try:
            db.add(connection)
            db.flush()

            req_prof = db.query(Profile).filter(Profile.user_id == requester_id).first()
            actor_name = req_prof.display_name if req_prof else "Someone"
            NotificationService.create_notification(
                db=db,
                recipient_id=target_user_id,
                actor_id=requester_id,
                type=NotificationType.CONNECTION_REQUEST,
                title="Connection Request",
                message=f"{actor_name} sent you a connection request.",
                reference_id=connection.id,
            )

            db.commit()
            db.refresh(connection)
            return ConnectionResponse.model_validate(connection)
        except IntegrityError:
            db.rollback()
            raise DuplicateConnectionRequestException("This request has already been sent.")

    @staticmethod
    def get_incoming_requests(db: Session, user_id: UUID) -> IncomingRequestsResponse:
        """
        Retrieve incoming pending connection requests for the authenticated user.
        """
        results = (
            db.query(Connection, Profile, UserActivity.activity_type)
            .join(Profile, Connection.requester_id == Profile.user_id)
            .outerjoin(UserActivity, Connection.requester_id == UserActivity.user_id)
            .filter(
                Connection.receiver_id == user_id,
                Connection.status == ConnectionStatus.PENDING.value,
            )
            .order_by(Connection.created_at.desc())
            .all()
        )

        items = []
        for conn, prof, act_type in results:
            items.append(
                ConnectionRequestItem(
                    id=conn.id,
                    created_at=conn.created_at,
                    requester=_build_public_user(prof, act_type),
                )
            )

        return IncomingRequestsResponse(requests=items, total=len(items))

    @staticmethod
    def accept_request(db: Session, connection_id: UUID, user_id: UUID) -> ConnectionResponse:
        """
        Accept an incoming connection request. Only the receiver is authorized.
        """
        connection = db.query(Connection).filter(Connection.id == connection_id).first()
        if not connection:
            raise ConnectionNotFoundException("Connection request not found.")

        if connection.receiver_id != user_id:
            raise UnauthorizedConnectionActionException("Only the receiver can accept this connection request.")

        connection.status = ConnectionStatus.ACCEPTED.value
        connection.updated_at = func.now()

        # Notify the requester that their request was accepted
        receiver_prof = db.query(Profile).filter(Profile.user_id == user_id).first()
        actor_name = receiver_prof.display_name if receiver_prof else "Someone"
        NotificationService.create_notification(
            db=db,
            recipient_id=connection.requester_id,
            actor_id=user_id,
            type=NotificationType.CONNECTION_ACCEPTED,
            title="Connection Accepted",
            message=f"{actor_name} accepted your connection request.",
            reference_id=connection.id,
        )

        db.commit()
        db.refresh(connection)
        return ConnectionResponse.model_validate(connection)

    @staticmethod
    def reject_request(db: Session, connection_id: UUID, user_id: UUID) -> ConnectionResponse:
        """
        Reject an incoming connection request. Only the receiver is authorized.
        """
        connection = db.query(Connection).filter(Connection.id == connection_id).first()
        if not connection:
            raise ConnectionNotFoundException("Connection request not found.")

        if connection.receiver_id != user_id:
            raise UnauthorizedConnectionActionException("Only the receiver can reject this connection request.")

        connection.status = ConnectionStatus.REJECTED.value
        connection.updated_at = func.now()

        db.commit()
        db.refresh(connection)
        return ConnectionResponse.model_validate(connection)

    @staticmethod
    def cancel_request(db: Session, connection_id: UUID, user_id: UUID) -> None:
        """
        Cancel an outgoing connection request. Only the original requester is authorized.
        """
        connection = db.query(Connection).filter(Connection.id == connection_id).first()
        if not connection:
            raise ConnectionNotFoundException("Connection request not found.")

        if connection.requester_id != user_id:
            raise UnauthorizedConnectionActionException("Only the requester can cancel this connection request.")

        if connection.status != ConnectionStatus.PENDING.value:
            raise UnauthorizedConnectionActionException("Only pending connection requests can be cancelled.")

        db.delete(connection)
        db.commit()

    @staticmethod
    def get_accepted_connections(db: Session, user_id: UUID) -> ConnectionsListResponse:
        """
        Retrieve all accepted mutual connections for the authenticated user.
        """
        connections = (
            db.query(Connection)
            .filter(
                or_(Connection.requester_id == user_id, Connection.receiver_id == user_id),
                Connection.status == ConnectionStatus.ACCEPTED.value,
            )
            .order_by(Connection.updated_at.desc())
            .all()
        )

        items = []
        for conn in connections:
            counterparty_id = conn.receiver_id if conn.requester_id == user_id else conn.requester_id
            prof = ProfileService.get_by_user_id(db, counterparty_id)
            if not prof:
                continue

            act = db.query(UserActivity).filter(UserActivity.user_id == counterparty_id).first()
            act_type = act.activity_type if act else None

            items.append(
                ConnectedPersonItem(
                    id=conn.id,
                    connected_at=conn.updated_at,
                    user=_build_public_user(prof, act_type),
                )
            )

        return ConnectionsListResponse(connections=items, total=len(items))

    @staticmethod
    def get_connection_status_map(
        db: Session, user_id: UUID, candidate_user_ids: List[UUID]
    ) -> Dict[UUID, Tuple[PersonConnectionStatus, UUID]]:
        """
        Batch resolves connection statuses between the viewer and a list of candidates.
        Returns a mapping: {candidate_user_id: (PersonConnectionStatus, connection_id)}
        """
        if not candidate_user_ids:
            return {}

        connections = (
            db.query(Connection)
            .filter(
                or_(
                    and_(Connection.requester_id == user_id, Connection.receiver_id.in_(candidate_user_ids)),
                    and_(Connection.receiver_id == user_id, Connection.requester_id.in_(candidate_user_ids)),
                )
            )
            .all()
        )

        status_map: Dict[UUID, Tuple[PersonConnectionStatus, UUID]] = {}
        for conn in connections:
            if conn.status == ConnectionStatus.ACCEPTED.value:
                other_id = conn.receiver_id if conn.requester_id == user_id else conn.requester_id
                status_map[other_id] = (PersonConnectionStatus.CONNECTED, conn.id)
            elif conn.status == ConnectionStatus.PENDING.value:
                if conn.requester_id == user_id:
                    status_map[conn.receiver_id] = (PersonConnectionStatus.REQUEST_SENT, conn.id)
                else:
                    status_map[conn.requester_id] = (PersonConnectionStatus.REQUEST_RECEIVED, conn.id)

        return status_map
