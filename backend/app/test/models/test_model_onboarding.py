import pytest
import uuid
from sqlalchemy.orm import Session
from app.models.user_model import User
from app.models.onboarding_model import UserOnboarding, OnboardingStatus
from app.core.security import get_password_hash

def create_user(db: Session, email=None) -> User:
    if not email:
        email = f"onboard_test_{uuid.uuid4()}@example.com"
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

def test_onboarding_creation(db: Session):
    """Test onboarding record creation"""
    user = create_user(db)
    
    onboarding = UserOnboarding(
        user_id=user.id,
        status=OnboardingStatus.in_progress,
        current_step=1,
        preferences_set=True
    )
    db.add(onboarding)
    db.commit()
    db.refresh(onboarding)
    
    assert onboarding.id is not None
    assert onboarding.user_id == user.id
    assert onboarding.status == OnboardingStatus.in_progress
    assert onboarding.preferences_set == True
    assert onboarding.profile_completed is False # Default

def test_onboarding_json_data(db: Session):
    """Test Onboarding JSON data field"""
    user = create_user(db)
    data = {"career_goals": ["CTO", "Founder"], "interests": ["AI", "Fintech"]}
    
    onboarding = UserOnboarding(
        user_id=user.id,
        onboarding_data=data
    )
    db.add(onboarding)
    db.commit()
    db.refresh(onboarding)
    
    assert onboarding.onboarding_data["career_goals"] == ["CTO", "Founder"]
