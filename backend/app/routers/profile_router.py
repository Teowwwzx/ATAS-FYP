# profile_router.py


from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
from app.database.database import get_db
from app.schemas.profile_schema import ProfileCreate, ProfileResponse, ProfileUpdate, OnboardingUpdate
from app.models.user_model import User
from app.services import profile_service, user_service
from app.dependencies import get_current_user, get_current_user_optional
from typing import List
from fastapi import File, UploadFile

router = APIRouter()

@router.put("/me/onboarding", response_model=ProfileResponse)
def complete_onboarding(onboarding_data: OnboardingUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile_update = ProfileUpdate(full_name=onboarding_data.full_name)
    db_profile = profile_service.update_profile(db, user_id=current_user.id, profile=profile_update)
    if db_profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    user_service.assign_role_to_user(db, user=current_user, role_name=onboarding_data.role)

    return db_profile

@router.get("/me", response_model=ProfileResponse)
def read_my_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_profile = profile_service.get_profile(db, user_id=current_user.id)
    if db_profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return db_profile

@router.get("/{user_id}", response_model=ProfileResponse)
def read_profile(user_id: uuid.UUID, db: Session = Depends(get_db), current_user: User | None = Depends(get_current_user_optional)):
    db_profile = profile_service.get_profile(db, user_id=user_id)
    if db_profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    # Enforce visibility for private profiles
    if db_profile.visibility.value == "private":
        if current_user is None or current_user.id != user_id:
            raise HTTPException(status_code=403, detail="This profile is private")
    return db_profile

@router.get("", response_model=List[ProfileResponse])
def list_public_profiles(db: Session = Depends(get_db)):
    profiles = profile_service.list_profiles(db, visibility="public")
    return profiles

@router.put("/me", response_model=ProfileResponse)
def update_current_user_profile(
    profile: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id
    db_profile = profile_service.update_profile(
        db, user_id=user_id, profile=profile
    )
    if db_profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return db_profile


@router.put("/me/avatar", response_model=ProfileResponse)
def update_my_avatar(
    avatar: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_profile = profile_service.update_avatar(db, user_id=current_user.id, avatar=avatar)
    if db_profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return db_profile


@router.put("/me/cover_picture", response_model=ProfileResponse)
def update_my_cover_picture(
    cover_picture: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_profile = profile_service.update_cover_picture(
        db, user_id=current_user.id, cover_picture=cover_picture
    )
    if db_profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return db_profile