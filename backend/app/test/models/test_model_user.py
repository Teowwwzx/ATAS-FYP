import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.models.user_model import User, UserStatus
from app.models.profile_model import Profile, ProfileVisibility
from app.core.security import verify_password, get_password_hash
import uuid

def test_create_user(db: Session):
    """Test creating a user with valid data"""
    email = f"test_{uuid.uuid4()}@example.com"
    password = "securepassword123"
    hashed_password = get_password_hash(password)
    
    user = User(
        email=email,
        password=hashed_password,
        status=UserStatus.active,
        referral_code=uuid.uuid4().hex[:8],
        is_dashboard_pro=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    assert user.id is not None
    assert user.email == email
    assert user.status == UserStatus.active
    assert verify_password(password, user.password)
    assert user.created_at is not None

def test_user_email_uniqueness(db: Session):
    """Test that creating a user with a duplicate email fails"""
    email = f"duplicate_{uuid.uuid4()}@example.com"
    
    # Create first user
    user1 = User(
        email=email,
        password=get_password_hash("pass1"),
        referral_code=uuid.uuid4().hex[:8],
        is_dashboard_pro=False
    )
    db.add(user1)
    db.commit()

    # Try creating second user with same email
    user2 = User(
        email=email,
        password=get_password_hash("pass2"),
        referral_code=uuid.uuid4().hex[:8],
        is_dashboard_pro=False
    )
    db.add(user2)
    
    with pytest.raises(IntegrityError):
        db.commit()
    
    db.rollback()

def test_user_referral_code_uniqueness(db: Session):
    """Test that creating a user with a duplicate referral code fails"""
    referral_code = uuid.uuid4().hex[:8]
    
    # Create first user
    user1 = User(
        email=f"ref_test1_{uuid.uuid4()}@example.com",
        password=get_password_hash("pass1"),
        referral_code=referral_code,
        is_dashboard_pro=False
    )
    db.add(user1)
    db.commit()

    # Try creating second user with same referral code
    user2 = User(
        email=f"ref_test2_{uuid.uuid4()}@example.com",
        password=get_password_hash("pass2"),
        referral_code=referral_code,
        is_dashboard_pro=False
    )
    db.add(user2)
    
    with pytest.raises(IntegrityError):
        db.commit()
    
    db.rollback()

def test_read_user(db: Session):
    """Test retrieving a user by ID and Email"""
    email = f"read_{uuid.uuid4()}@example.com"
    user = User(
        email=email,
        password=get_password_hash("pass"),
        referral_code=uuid.uuid4().hex[:8]
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Read by ID
    fetched_user = db.query(User).filter(User.id == user.id).first()
    assert fetched_user is not None
    assert fetched_user.email == email

    # Read by Email
    fetched_by_email = db.query(User).filter(User.email == email).first()
    assert fetched_by_email is not None
    assert fetched_by_email.id == user.id

def test_update_user(db: Session):
    """Test updating user fields"""
    user = User(
        email=f"update_{uuid.uuid4()}@example.com",
        password=get_password_hash("pass"),
        status=UserStatus.inactive,
        referral_code=uuid.uuid4().hex[:8]
    )
    db.add(user)
    db.commit()

    # Update status
    user.status = UserStatus.active
    user.is_verified = True
    db.commit()
    db.refresh(user)

    assert user.status == UserStatus.active
    assert user.is_verified is True
    assert user.updated_at is not None

def test_delete_user(db: Session):
    """Test deleting a user"""
    user = User(
        email=f"del_{uuid.uuid4()}@example.com",
        password=get_password_hash("pass"),
        referral_code=uuid.uuid4().hex[:8]
    )
    db.add(user)
    db.commit()
    
    user_id = user.id
    db.delete(user)
    db.commit()

    # Verify deletion
    fetched_user = db.query(User).filter(User.id == user_id).first()
    assert fetched_user is None

def test_user_profile_relationship(db: Session):
    """Test One-to-One relationship between User and Profile"""
    # Create User
    user = User(
        email=f"profile_rel_{uuid.uuid4()}@example.com",
        password=get_password_hash("pass"),
        referral_code=uuid.uuid4().hex[:8]
    )
    db.add(user)
    db.commit()

    # Create Profile linked to User
    profile = Profile(
        user_id=user.id,
        full_name="Test Relationship",
        visibility=ProfileVisibility.public
    )
    db.add(profile)
    db.commit()
    
    db.refresh(user)
    
    # Access profile from user
    assert user.profile is not None
    assert user.profile.full_name == "Test Relationship"
    assert user.profile.id == profile.id
    assert user.full_name == "Test Relationship"  # Test property

def test_user_cascade_delete_profile(db: Session):
    """Test that deleting a User also deletes their Profile"""
    user = User(
        email=f"cascade_{uuid.uuid4()}@example.com",
        password=get_password_hash("pass"),
        referral_code=uuid.uuid4().hex[:8]
    )
    db.add(user)
    db.commit()

    profile = Profile(
        user_id=user.id,
        full_name="Cascade Delete"
    )
    db.add(profile)
    db.commit()
    
    profile_id = profile.id
    
    # Delete User
    db.delete(user)
    db.commit()

    # Verify Profile is gone
    fetched_profile = db.query(Profile).filter(Profile.id == profile_id).first()
    assert fetched_profile is None
