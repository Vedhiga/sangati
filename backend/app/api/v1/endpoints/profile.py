from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user, AuthenticatedUser
from app.core.errors import ProfileNotFoundException
from app.schemas.profile import ProfileCreate, ProfileUpdate, ProfileResponse
from app.schemas.error import ErrorResponse
from app.services.profile_service import ProfileService

router = APIRouter(
    prefix="/profile",
    tags=["Profile"],
    responses={
        401: {"model": ErrorResponse, "description": "Authentication required or invalid token"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)


@router.get(
    "/me",
    response_model=ProfileResponse,
    summary="Get Current User Profile",
    responses={404: {"model": ErrorResponse, "description": "Profile not found"}},
)
def get_my_profile(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve the profile of the currently authenticated user.
    The user's identity is securely extracted from the validated Supabase JWT access token.
    """
    profile = ProfileService.get_by_user_id(db, current_user.id)
    if not profile:
        raise ProfileNotFoundException("Profile has not been created yet.")
    return profile


@router.post(
    "",
    response_model=ProfileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create User Profile",
    responses={
        400: {"model": ErrorResponse, "description": "Validation error or invalid username"},
        409: {"model": ErrorResponse, "description": "Username or profile already exists"},
    },
)
def create_profile(
    profile_in: ProfileCreate,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a profile for the currently authenticated user.
    The user_id is automatically associated with the authenticated user ID from the verified token.
    """
    profile = ProfileService.create_profile(
        db=db,
        user_id=current_user.id,
        profile_in=profile_in,
    )
    return profile


@router.put(
    "/me",
    response_model=ProfileResponse,
    summary="Update Current User Profile",
    responses={
        400: {"model": ErrorResponse, "description": "Validation error or invalid username"},
        404: {"model": ErrorResponse, "description": "Profile not found"},
        409: {"model": ErrorResponse, "description": "Username already exists"},
    },
)
def update_my_profile(
    profile_in: ProfileUpdate,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update the profile of the currently authenticated user.
    Users can only modify their own profile.
    """
    profile = ProfileService.update_profile(
        db=db,
        user_id=current_user.id,
        profile_in=profile_in,
    )
    return profile
