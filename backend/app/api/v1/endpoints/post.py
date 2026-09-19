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
