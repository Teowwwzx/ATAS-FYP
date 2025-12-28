from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.follows_model import Follow
from app.schemas.follows_schema import FollowDetails, FollowCreate
from typing import List
import uuid
from app.dependencies import get_current_user
from app.models.user_model import User

router = APIRouter()

@router.get("/follows", response_model=List[FollowDetails])
def get_all_follows(db: Session = Depends(get_db)):
    follows = db.query(Follow).all()
    return follows

@router.get("/follows/me", response_model=List[FollowDetails])
def get_my_follows(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Who I am following"""
    items = db.query(Follow).filter(Follow.follower_id == current_user.id).all()
    return items

@router.get("/followers/me", response_model=List[FollowDetails])
def get_my_followers(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Who follows me"""
    items = db.query(Follow).filter(Follow.followee_id == current_user.id).all()
    return items

@router.get("/users/{user_id}/follows", response_model=List[FollowDetails])
def get_user_follows(user_id: uuid.UUID, db: Session = Depends(get_db)):
    """Who this user is following"""
    items = db.query(Follow).filter(Follow.follower_id == user_id).all()
    return items

@router.get("/users/{user_id}/followers", response_model=List[FollowDetails])
def get_user_followers(user_id: uuid.UUID, db: Session = Depends(get_db)):
    """Who follows this user"""
    items = db.query(Follow).filter(Follow.followee_id == user_id).all()
    return items

@router.post("/follows", response_model=FollowDetails)
def follow_user(body: FollowCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if body.followee_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    existing = (
        db.query(Follow)
        .filter(Follow.follower_id == current_user.id, Follow.followee_id == body.followee_id)
        .first()
    )
    if existing:
        return existing
    relation = Follow(follower_id=current_user.id, followee_id=body.followee_id)
    db.add(relation)
    db.commit()
    db.refresh(relation)
    return relation

@router.delete("/follows/{followee_id}", status_code=204)
def unfollow_user(followee_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    relation = (
        db.query(Follow)
        .filter(Follow.follower_id == current_user.id, Follow.followee_id == followee_id)
        .first()
    )
    if relation is None:
        raise HTTPException(status_code=404, detail="Follow relationship not found")
    db.delete(relation)
    db.commit()
    return
