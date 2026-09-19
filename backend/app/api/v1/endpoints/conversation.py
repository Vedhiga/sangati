from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user, AuthenticatedUser
from app.schemas.conversation import (
    MessageCreate,
    MessageResponse,
    MessagesListResponse,
    ConversationsListResponse,
    ConversationDetailResponse,
    GroupConversationCreate,
)
from app.services.conversation_service import ConversationService

router = APIRouter(prefix="/conversations", tags=["Conversations"])


@router.post(
    "/group",
    response_model=ConversationDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start a small group conversation with connected users",
)
def create_group_conversation(
    data: GroupConversationCreate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Start a small group conversation with multiple connected users.
    Requires all participants to have mutual accepted connections with the current user.
    """
    return ConversationService.create_group_conversation(
        db=db,
        current_user_id=current_user.id,
        data=data,
    )


@router.post(
    "/{user_id}",
    response_model=ConversationDetailResponse,
    summary="Start or get 1-to-1 conversation with a connected user",
)
def get_or_create_conversation(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Start or retrieve an existing 1-to-1 conversation with another connected user.
    Enforces mutual accepted connection and prevents duplicate conversations.
    """
    return ConversationService.get_or_create_conversation(
        db=db,
        current_user_id=current_user.id,
        target_user_id=user_id,
    )


@router.get(
    "",
    response_model=ConversationsListResponse,
    summary="List conversations for current user",
)
def get_user_conversations(
    limit: int = Query(20, ge=1, le=50, description="Max conversations to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Retrieve all conversations for the authenticated user, ordered by last_message_at DESC.
    """
    return ConversationService.get_user_conversations(
        db=db,
        current_user_id=current_user.id,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/{conversation_id}",
    response_model=ConversationDetailResponse,
    summary="Get conversation details",
)
def get_conversation_detail(
    conversation_id: UUID,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Get details for a conversation. Current user must be a participant.
    """
    return ConversationService.get_conversation_detail(
        db=db,
        conversation_id=conversation_id,
        current_user_id=current_user.id,
    )


@router.get(
    "/{conversation_id}/messages",
    response_model=MessagesListResponse,
    summary="Get chronological messages in a conversation",
)
def get_conversation_messages(
    conversation_id: UUID,
    limit: int = Query(50, ge=1, le=100, description="Max messages to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Retrieve messages from a conversation in chronological order (created_at ASC).
    Current user must be a participant.
    """
    return ConversationService.get_conversation_messages(
        db=db,
        conversation_id=conversation_id,
        current_user_id=current_user.id,
        limit=limit,
        offset=offset,
    )


@router.post(
    "/{conversation_id}/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Send a message into a conversation",
)
def send_message(
    conversation_id: UUID,
    data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Send a message into a conversation. Sender is strictly derived from the authenticated token.
    Updates conversation.last_message_at.
    """
    return ConversationService.send_message(
        db=db,
        conversation_id=conversation_id,
        current_user_id=current_user.id,
        data=data,
    )
