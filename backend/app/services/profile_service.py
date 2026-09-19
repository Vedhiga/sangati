import json
import logging
from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.profile import Profile
from app.schemas.profile import ProfileCreate, ProfileUpdate
from app.core.errors import (
    ProfileNotFoundException,
    ProfileAlreadyExistsException,
    UsernameAlreadyExistsException,
)

logger = logging.getLogger("sidequest.services.profile")


class ProfileService:
    @staticmethod
    def get_by_user_id(db: Session, user_id: UUID) -> Optional[Profile]:
        return db.query(Profile).filter(Profile.user_id == user_id).first()

    @staticmethod
    def get_by_username(db: Session, username: str) -> Optional[Profile]:
        return db.query(Profile).filter(Profile.username == username.lower()).first()

    @staticmethod
    def create_profile(db: Session, user_id: UUID, profile_in: ProfileCreate) -> Profile:
        # Check if this user already has a profile
        existing_user_profile = ProfileService.get_by_user_id(db, user_id)
        if existing_user_profile:
            raise ProfileAlreadyExistsException("A profile already exists for this user account.")

        # Check if username is already taken
        existing_username = ProfileService.get_by_username(db, profile_in.username)
        if existing_username:
            raise UsernameAlreadyExistsException("This username is already taken.")

        interests_str = (
            json.dumps(profile_in.interests) if profile_in.interests is not None else None
        )

        profile = Profile(
            user_id=user_id,
            username=profile_in.username,
            display_name=profile_in.display_name,
            bio=profile_in.bio,
            avatar_url=profile_in.avatar_url,
            interests=interests_str,
        )

        try:
            db.add(profile)
            db.commit()
            db.refresh(profile)
            return profile
        except IntegrityError as e:
            db.rollback()
            logger.warning("Database integrity error on profile creation: %s", e)
            # Check whether it was a username collision or user_id collision
            if "username" in str(e).lower():
                raise UsernameAlreadyExistsException("This username is already taken.")
            raise ProfileAlreadyExistsException("A profile already exists for this user account.")

    @staticmethod
    def update_profile(db: Session, user_id: UUID, profile_in: ProfileUpdate) -> Profile:
        profile = ProfileService.get_by_user_id(db, user_id)
        if not profile:
            raise ProfileNotFoundException("Profile not found. Please complete profile setup first.")

        # If updating username, check uniqueness
        if profile_in.username and profile_in.username.lower() != profile.username:
            existing_user = ProfileService.get_by_username(db, profile_in.username)
            if existing_user and existing_user.user_id != user_id:
                raise UsernameAlreadyExistsException("This username is already taken.")
            profile.username = profile_in.username.lower()

        if profile_in.display_name is not None:
            profile.display_name = profile_in.display_name

        if profile_in.bio is not None:
            profile.bio = profile_in.bio

        if profile_in.avatar_url is not None:
            profile.avatar_url = profile_in.avatar_url

        if profile_in.interests is not None:
            profile.interests = json.dumps(profile_in.interests)

        try:
            db.commit()
            db.refresh(profile)
            return profile
        except IntegrityError as e:
            db.rollback()
            logger.warning("Database integrity error on profile update: %s", e)
            if "username" in str(e).lower():
                raise UsernameAlreadyExistsException("This username is already taken.")
            raise
