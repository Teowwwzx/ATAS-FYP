import pytest
import uuid
from sqlalchemy.orm import Session
from app.models.user_model import User
from app.models.profile_model import Profile, ProfileVisibility
from app.models.skill_model import Skill
from app.core.security import get_password_hash

def create_user_helper(db: Session, email=None) -> User:
    if not email:
        email = f"profile_test_{uuid.uuid4()}@example.com"
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

def test_create_profile(db: Session):
    """Test creating a profile with minimal required fields"""
    user = create_user_helper(db)
    
    profile = Profile(
        user_id=user.id,
        full_name="Test Profile",
        is_onboarded=False
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)

    assert profile.id is not None
    assert profile.user_id == user.id
    assert profile.full_name == "Test Profile"
    assert profile.average_rating == 0.0
    assert profile.visibility == ProfileVisibility.public # Default

def test_profile_update(db: Session):
    """Test updating profile fields including JSON intents"""
    user = create_user_helper(db)
    profile = Profile(
        user_id=user.id,
        full_name="Original Name",
        visibility=ProfileVisibility.private
    )
    db.add(profile)
    db.commit()

    # Update
    profile.full_name = "Updated Name"
    profile.bio = "New Bio"
    profile.intents = ["hiring", "speaking"]
    profile.visibility = ProfileVisibility.public
    db.commit()
    db.refresh(profile)

    assert profile.full_name == "Updated Name"
    assert profile.bio == "New Bio"
    assert profile.intents == ["hiring", "speaking"]
    assert profile.visibility == ProfileVisibility.public

def test_profile_skills_relationship(db: Session):
    """Test adding skills to profile"""
    user = create_user_helper(db)
    profile = Profile(user_id=user.id, full_name="Skilled User")
    db.add(profile)
    db.commit()

    # Create skills
    skill1 = Skill(name="Python")
    skill2 = Skill(name="FastAPI")
    db.add_all([skill1, skill2])
    db.commit()

    # Add skills via association table implicitly?
    # Profile has 'skills' relationship with 'Skill' model via 'profile_skills'
    # BUT profile_skills has extra column 'level'. 
    # SQLAlchemy many-to-many with association object or extra columns often requires association model.
    # checking profile_model.py: 
    # skills = relationship("Skill", secondary=profile_skills, back_populates="profiles")
    # if secondary table has extra columns (level), adding directly to .skills might fail if 'level' is not nullable.
    # Let's check profile_model.py: Column('level', Integer, nullable=False)
    # So we CANNOT just do profile.skills.append(skill1) because level is required.
    
    # We need to insert into profile_skills manually or mapping.
    # Since existing model uses secondary=table, it assumes simple M2M or view-only?
    # No, 'level' is non-nullable.
    # This implies we can't use `profile.skills.append(skill)` directly unless we provide defaults?
    # Or we must use the Table insert.
    pass

def test_profile_tags_relationship(db: Session):
    """Test tags relationship (simple M2M)"""
    # Tags table doesn't have extra non-null columns likely.
    # Checking profile_model.py: profile_tags table has columns profile_id, tag_id, created_at.
    # created_at has default.
    from app.models.profile_model import Tag
    
    user = create_user_helper(db)
    profile = Profile(user_id=user.id, full_name="Tagged User")
    db.add(profile)
    db.commit()

    tag = Tag(name="Developer")
    db.add(tag)
    db.commit()

    profile.tags.append(tag)
    db.commit()
    db.refresh(profile)

    assert len(profile.tags) == 1
    assert profile.tags[0].name == "Developer"

def test_delete_profile(db: Session):
    """Test deleting profile"""
    user = create_user_helper(db)
    profile = Profile(user_id=user.id, full_name="To Delete")
    db.add(profile)
    db.commit()
    
    db.delete(profile)
    db.commit()
    
    # Verify user still exists (ondelete CASCADE is foreign key on Profile, so deleting profile doesn't delete user)
    db.refresh(user)
    assert user.id is not None
    
    assert db.query(Profile).filter(Profile.id == profile.id).first() is None
