from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user, AuthenticatedUser
from app.schemas.post import (
    PostCreate,
    PostUpdate,
    PostResponse,
    PostsListResponse,
    CommentCreate,
    CommentResponse,
    CommentsListResponse,
    ReactionToggleRequest,
)
from app.schemas.activity import ActivityType
from app.services.post_service import PostService

router = APIRouter(prefix="/posts", tags=["Activity Posts"])


@router.post(
    "",
    response_model=PostResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create an activity post",
)
def create_post(
    data: PostCreate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Publish an activity post anchored to a chosen activity type (BUILD, LEARN, CONVERSATION, or EXPLORE).
    The author is strictly identified by the authenticated JWT.
    """
    return PostService.create_post(db, current_user.id, data)


@router.get(
    "",
    response_model=PostsListResponse,
    summary="Get newest activity posts",
)
def get_posts(
    activity: Optional[ActivityType] = Query(None, description="Optional activity filter"),
    limit: int = Query(20, ge=1, le=50, description="Max posts to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Retrieve activity posts ordered chronologically (newest first).
    Supports pagination and optional activity filtering.
    """
    return PostService.get_posts(
        db=db,
        activity_type=activity,
        limit=limit,
        offset=offset,
        current_user_id=current_user.id,
    )


@router.get(
    "/user/{user_id}",
    response_model=PostsListResponse,
    summary="Get posts by a specific user",
)
def get_user_posts(
    user_id: UUID,
    limit: int = Query(20, ge=1, le=50, description="Max posts to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Retrieve all public activity posts authored by a specific user, newest first.
    """
    return PostService.get_user_posts(
        db=db,
        user_id=user_id,
        limit=limit,
        offset=offset,
        current_user_id=current_user.id,
    )


@router.put(
    "/{post_id}",
    response_model=PostResponse,
    summary="Edit own activity post",
)
def update_post(
    post_id: UUID,
    data: PostUpdate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Update the content of an existing post. Only the post author can update it.
    """
    return PostService.update_post(
        db=db,
        post_id=post_id,
        current_user_id=current_user.id,
        data=data,
    )


@router.delete(
    "/{post_id}",
    summary="Delete own activity post",
)
def delete_post(
    post_id: UUID,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Delete an activity post. Only the post author can delete it.
    """
    PostService.delete_post(
        db=db,
        post_id=post_id,
        current_user_id=current_user.id,
    )
    return {"success": True, "message": "Post deleted successfully."}


# --- LIKES & REACTIONS ---
@router.post(
    "/{post_id}/like",
    response_model=PostResponse,
    summary="Toggle like on a post",
)
def toggle_like(
    post_id: UUID,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Add or remove a like on a post.
    """
    return PostService.toggle_like(db, post_id, current_user.id)


@router.post(
    "/{post_id}/reactions",
    response_model=PostResponse,
    summary="Toggle emoji reaction on a post",
)
def toggle_reaction(
    post_id: UUID,
    data: ReactionToggleRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Add or toggle an emoji reaction on a post.
    """
    return PostService.toggle_reaction(db, post_id, current_user.id, data.reaction_type)


@router.delete(
    "/{post_id}/reactions",
    response_model=PostResponse,
    summary="Remove current user's reaction from a post",
)
def remove_user_reaction(
    post_id: UUID,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Remove current user's reaction from a post.
    """
    return PostService.remove_reaction(db, post_id, current_user.id)


@router.delete(
    "/{post_id}/reactions/{reaction_type}",
    response_model=PostResponse,
    summary="Remove emoji reaction from a post",
)
def remove_reaction(
    post_id: UUID,
    reaction_type: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Explicitly remove a reaction type from a post.
    """
    return PostService.remove_reaction(db, post_id, current_user.id)


# --- COMMENTS ---
@router.get(
    "/{post_id}/comments",
    response_model=CommentsListResponse,
    summary="Get comments for a post",
)
def get_comments(
    post_id: UUID,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Get all comments for a specific post.
    """
    return PostService.get_comments(db, post_id)


@router.post(
    "/{post_id}/comments",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a comment to a post",
)
def create_comment(
    post_id: UUID,
    data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Add a new comment to a post.
    """
    return PostService.create_comment(db, post_id, current_user.id, data)


@router.put(
    "/{post_id}/comments/{comment_id}",
    response_model=CommentResponse,
    summary="Edit own comment on a post",
)
def update_comment(
    post_id: UUID,
    comment_id: UUID,
    data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Edit an existing comment. Only the comment author can edit it.
    """
    return PostService.update_comment(db, post_id, comment_id, current_user.id, data)


@router.delete(
    "/{post_id}/comments/{comment_id}",
    summary="Delete own comment on a post",
)
def delete_comment(
    post_id: UUID,
    comment_id: UUID,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Delete a comment. Only the comment author can delete it.
    """
    PostService.delete_comment(db, post_id, comment_id, current_user.id)
    return {"success": True, "message": "Comment deleted successfully."}

