from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
from app.database.database import get_db
from app.schemas.profile_schema import ProfileCreate, ProfileResponse, ProfileUpdate
from app.services import profile_service

router = APIRouter()

@router.post("/{user_id}", response_model=ProfileResponse)
def create_user_profile(user_id: uuid.UUID, profile: ProfileCreate, db: Session = Depends(get_db)):
    db_profile = profile_service.get_profile(db, user_id=user_id)
    if db_profile:
        raise HTTPException(status_code=400, detail="Profile already exists for this user")
    return profile_service.create_profile(db=db, profile=profile, user_id=user_id)

@router.get("/{user_id}", response_model=ProfileResponse)
def read_user_profile(user_id: uuid.UUID, db: Session = Depends(get_db)):
    db_profile = profile_service.get_profile(db, user_id=user_id)
    if db_profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return db_profile

@router.put("/{user_id}", response_model=ProfileResponse)
def update_user_profile(user_id: uuid.UUID, profile: ProfileUpdate, db: Session = Depends(get_db)):
    db_profile = profile_service.update_profile(db, user_id=user_id, profile=profile)
    if db_profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return db_profile