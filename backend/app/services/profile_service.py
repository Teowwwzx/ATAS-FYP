from sqlalchemy.orm import Session
import uuid
from app.models.profile_model import Profile
from app.schemas.profile_schema import ProfileCreate, ProfileUpdate

def get_profile(db: Session, user_id: uuid.UUID):
    return db.query(Profile).filter(Profile.user_id == user_id).first()

def create_profile(db: Session, profile: ProfileCreate, user_id: uuid.UUID):
    db_profile = Profile(**profile.model_dump(), user_id=user_id)
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_profile

def update_profile(db: Session, user_id: uuid.UUID, profile: ProfileUpdate):
    db_profile = get_profile(db, user_id)
    if db_profile:
        for key, value in profile.model_dump(exclude_unset=True).items():
            setattr(db_profile, key, value)
        db.commit()
        db.refresh(db_profile)
    return db_profile