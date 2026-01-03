import pytest
import uuid
from sqlalchemy.orm import Session
from app.models.user_model import User
from app.models.review_model import Review
from app.core.security import get_password_hash

def create_user(db: Session, email=None) -> User:
    if not email:
        email = f"review_test_{uuid.uuid4()}@example.com"
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

def test_create_review(db: Session):
    """Test creating a review"""
    reviewer = create_user(db)
    reviewee = create_user(db)
    
    review = Review(
        reviewer_id=reviewer.id,
        reviewee_id=reviewee.id,
        rating=5,
        comment="Great!"
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    
    assert review.id is not None
    assert review.rating == 5
    assert review.comment == "Great!"

def test_review_rating_constraint(db: Session):
    """Test review rating (application logic vs db constraint)"""
    # DB just has Integer, no check constraint likely unless added in migration.
    # We verify it accepts integer.
    reviewer = create_user(db)
    reviewee = create_user(db)
    
    review = Review(
        reviewer_id=reviewer.id,
        reviewee_id=reviewee.id,
        rating=1, # Low rating
        comment="Bad"
    )
    db.add(review)
    db.commit()
    
    assert review.rating == 1
