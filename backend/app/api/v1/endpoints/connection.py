from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user, AuthenticatedUser
from app.schemas.connection import (
    ConnectionResponse,
    IncomingRequestsResponse,
    ConnectionsListResponse,
    ConnectionActionSuccess,
)
from app.schemas.error import ErrorResponse
from app.services.connection_service import ConnectionService

router = APIRouter(
    prefix="/connections",
    tags=["Connections"],
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request or business rule violation"},
        401: {"model": ErrorResponse, "description": "Authentication required or invalid token"},
        403: {"model": ErrorResponse, "description": "Unauthorized action on connection"},
        404: {"model": ErrorResponse, "description": "Resource not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)


@router.get(
    "",
    response_model=ConnectionsListResponse,
    summary="Get Connected People",
)
def get_connected_people(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve all accepted mutual connections for the authenticated user.
    """
    return ConnectionService.get_accepted_connections(
        db=db,
        user_id=current_user.id,
    )


@router.get(
    "/requests",
    response_model=IncomingRequestsResponse,
    summary="Get Incoming Connection Requests",
)
def get_incoming_requests(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve all pending incoming connection requests for the authenticated user.
    """
    return ConnectionService.get_incoming_requests(
        db=db,
        user_id=current_user.id,
    )


@router.post(
    "/{user_id}",
    response_model=ConnectionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Send Connection Request",
)
def send_connection_request(
    user_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Send a connection request to a target user.
    Enforces that users cannot connect with themselves, duplicate requests are prevented,
    and existing connections or reverse requests are detected.
    """
    return ConnectionService.send_request(
        db=db,
        requester_id=current_user.id,
        target_user_id=user_id,
    )


@router.put(
    "/{connection_id}/accept",
    response_model=ConnectionResponse,
    summary="Accept Connection Request",
)
def accept_connection_request(
    connection_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Accept an incoming connection request. Only the recipient is authorized.
    """
    return ConnectionService.accept_request(
        db=db,
        connection_id=connection_id,
        user_id=current_user.id,
    )


@router.put(
    "/{connection_id}/reject",
    response_model=ConnectionResponse,
    summary="Reject Connection Request",
)
def reject_connection_request(
    connection_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Reject an incoming connection request. Only the recipient is authorized.
    """
    return ConnectionService.reject_request(
        db=db,
        connection_id=connection_id,
        user_id=current_user.id,
    )


@router.delete(
    "/{connection_id}",
    response_model=ConnectionActionSuccess,
    summary="Cancel Connection Request",
)
def cancel_connection_request(
    connection_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Cancel an outgoing pending connection request. Only the original requester is authorized.
    """
    ConnectionService.cancel_request(
        db=db,
        connection_id=connection_id,
        user_id=current_user.id,
    )
    return ConnectionActionSuccess(
        success=True,
        message="Connection request cancelled successfully.",
    )
