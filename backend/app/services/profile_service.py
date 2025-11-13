from sqlalchemy.orm import Session
import uuid
from fastapi import UploadFile
from app.models.profile_model import Profile, ProfileVisibility
from app.schemas.profile_schema import ProfileCreate, ProfileUpdate
from app.services import cloudinary_service


def get_profile(db: Session, user_id: uuid.UUID):
    return db.query(Profile).filter(Profile.user_id == user_id).first()


def create_profile(db: Session, profile: ProfileCreate, user_id: uuid.UUID):
    db_profile = Profile(**profile.model_dump(), user_id=user_id)
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_profile


def update_profile(
    db: Session,
    user_id: uuid.UUID,
    profile: ProfileUpdate,
    avatar: UploadFile | None = None,
    cover_picture: UploadFile | None = None,
):
    db_profile = get_profile(db, user_id)
    if db_profile:
        # Update textual data, avoid overwriting non-null columns with None
        update_data = profile.model_dump(exclude_unset=True, exclude_none=True)
        for key, value in update_data.items():
            setattr(db_profile, key, value)

        # Handle avatar upload
        if avatar:
            avatar_url = cloudinary_service.upload_file(avatar, "avatars")
            db_profile.avatar_url = avatar_url

        # Handle cover picture upload
        if cover_picture:
            cover_url = cloudinary_service.upload_file(cover_picture, "covers")
            db_profile.cover_url = cover_url

        db.commit()
        db.refresh(db_profile)
    return db_profile


def list_profiles(db: Session, visibility: str | None = None):
    query = db.query(Profile)
    if visibility is not None:
        try:
            vis_enum = ProfileVisibility(visibility)
            query = query.filter(Profile.visibility == vis_enum)
        except ValueError:
            # Invalid visibility string, return empty list for simplicity
            return []
    return query.all()


def update_avatar(db: Session, user_id: uuid.UUID, avatar: UploadFile):
    db_profile = get_profile(db, user_id)
    if not db_profile:
        return None
    avatar_url = cloudinary_service.upload_file(avatar, "avatars")
    db_profile.avatar_url = avatar_url
    db.commit()
    db.refresh(db_profile)
    return db_profile


def update_cover_picture(db: Session, user_id: uuid.UUID, cover_picture: UploadFile):
    db_profile = get_profile(db, user_id)
    if not db_profile:
        return None
    cover_url = cloudinary_service.upload_file(cover_picture, "covers")
    db_profile.cover_url = cover_url
    db.commit()
    db.refresh(db_profile)
    return db_profile