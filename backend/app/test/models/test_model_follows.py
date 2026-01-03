import pytest
import uuid
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.user_model import User
from app.models.follows_model import Follow
from app.core.security import get_password_hash

def create_user(db: Session, email=None) -> User:
    if not email:
        email = f"follow_test_{uuid.uuid4()}@example.com"
    user = User(
        email=email,
        password=get_password_hash("test"),
        referral_code=uuid.uuid4().hex[:8],
        is_dashboard_pro=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def test_create_follow(db: Session):
    """Test creating a follow relationship"""
    follower = create_user(db)
    followee = create_user(db)
    
    follow = Follow(
        follower_id=follower.id,
        followee_id=followee.id
    )
    db.add(follow)
    db.commit()
    db.refresh(follow)
    
    assert follow.id is not None
    assert follow.follower_id == follower.id
    assert follow.followee_id == followee.id

def test_delete_follow(db: Session):
    """Test unfollowing"""
    follower = create_user(db)
    followee = create_user(db)
    
    follow = Follow(
        follower_id=follower.id,
        followee_id=followee.id
    )
    db.add(follow)
    db.commit()
    
    follow_id = follow.id
    db.delete(follow)
    db.commit()
    
    assert db.query(Follow).filter(Follow.id == follow_id).first() is None
