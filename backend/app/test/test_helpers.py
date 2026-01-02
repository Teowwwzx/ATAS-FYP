"""
Test Helper Utilities for Admin CRUD Tests

Provides factory functions for creating test data and common operations.
"""
import uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from app.models.user_model import User, UserStatus, Role
from app.models.profile_model import Profile, ProfileVisibility
from app.models.organization_model import Organization, OrganizationType, OrganizationStatus, OrganizationVisibility
from app.models.event_model import (
    Event, EventStatus, EventType, EventFormat, EventVisibility, 
    EventRegistrationType, EventRegistrationStatus, EventParticipant,
    EventParticipantRole, EventParticipantStatus, Category, EventCategory
)
from app.core.security import get_password_hash
from app.services.user_service import assign_role_to_user


def create_admin_user(db: Session, email: str = None) -> User:
    """Create an admin user with proper roles"""
    if email is None:
        email = f"admin-{uuid.uuid4().hex[:8]}@test.com"
    
    # Ensure admin role exists
    admin_role = db.query(Role).filter(Role.name == "admin").first()
    if not admin_role:
        admin_role = Role(name="admin")
        db.add(admin_role)
        db.commit()
    
    admin = User(
        email=email,
        password=get_password_hash("testpass123"),
        is_verified=True,
        status=UserStatus.active,
        referral_code=uuid.uuid4().hex[:8],
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    
    assign_role_to_user(db, admin, "admin")
    
    # Create profile
    profile = Profile(
        user_id=admin.id,
        full_name=f"Admin User",
        visibility=ProfileVisibility.public
    )
    db.add(profile)
    db.commit()
    
    return admin


def create_test_user(
    db: Session, 
    email: str = None,
    status: UserStatus = UserStatus.active,
    roles: list[str] = None,
    full_name: str = None
) -> User:
    """Create a test user with specified attributes"""
    if email is None:
        email = f"user-{uuid.uuid4().hex[:8]}@test.com"
    
    user = User(
        email=email,
        password=get_password_hash("testpass123"),
        is_verified=True,
        status=status,
        referral_code=uuid.uuid4().hex[:8],
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Assign roles
    if roles:
        for role_name in roles:
            role = db.query(Role).filter(Role.name == role_name).first()
            if not role:
                role = Role(name=role_name)
                db.add(role)
                db.commit()
            assign_role_to_user(db, user, role_name)
    
    # Create profile
    profile = Profile(
        user_id=user.id,
        full_name=full_name or f"Test User {user.email.split('@')[0]}",
        visibility=ProfileVisibility.public
    )
    db.add(profile)
    db.commit()
    
    return user


def create_test_organization(
    db: Session,
    owner_id: uuid.UUID,
    name: str = None,
    org_type: OrganizationType = OrganizationType.company,
    status: OrganizationStatus = OrganizationStatus.approved,
    visibility: OrganizationVisibility = OrganizationVisibility.public
) -> Organization:
    """Create a test organization"""
    if name is None:
        name = f"Test Org {uuid.uuid4().hex[:8]}"
    
    org = Organization(
        owner_id=owner_id,
        name=name,
        type=org_type,
        status=status,
        visibility=visibility,
        description=f"Test organization for {name}"
    )
    db.add(org)
    db.commit()
    db.refresh(org)
    return org


def create_test_event(
    db: Session,
    organizer_id: uuid.UUID,
    title: str = None,
    event_type: EventType = EventType.physical,
    event_format: EventFormat = EventFormat.seminar,
    status: EventStatus = EventStatus.draft,
    visibility: EventVisibility = EventVisibility.public,
    organization_id: uuid.UUID = None,
    categories: list[uuid.UUID] = None
) -> Event:
    """Create a test event with optional categories"""
    if title is None:
        title = f"Test Event {uuid.uuid4().hex[:8]}"
    
    start_dt = datetime.now() + timedelta(days=7)
    end_dt = start_dt + timedelta(hours=2)
    
    event = Event(
        organizer_id=organizer_id,
        organization_id=organization_id,
        title=title,
        description=f"Test event description for {title}",
        type=event_type,
        format=event_format,
        status=status,
        visibility=visibility,
        start_datetime=start_dt,
        end_datetime=end_dt,
        registration_type=EventRegistrationType.free,
        registration_status=EventRegistrationStatus.opened,
        max_participant=100,
        venue_remark="Test Venue"
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    
    # Add organizer as participant
    participant = EventParticipant(
        event_id=event.id,
        user_id=organizer_id,
        role=EventParticipantRole.organizer,
        status=EventParticipantStatus.accepted,
        join_method="seed"
    )
    db.add(participant)
    
    # Add categories
    if categories:
        for cat_id in categories:
            event_cat = EventCategory(event_id=event.id, category_id=cat_id)
            db.add(event_cat)
    
    db.commit()
    db.refresh(event)
    return event


def create_test_category(
    db: Session,
    name: str = None
) -> Category:
    """Create a test category"""
    if name is None:
        name = f"Test Category {uuid.uuid4().hex[:8]}"
    
    category = Category(
        name=name
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def get_admin_headers(client: TestClient, admin_user: User) -> dict:
    """Get authenticated headers for admin user"""
    response = client.post(
        "/api/v1/auth/login",
        data={"username": admin_user.email, "password": "testpass123"}
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def assert_field_updated(before_value, after_value, field_name: str):
    """Helper to assert a field was updated correctly"""
    assert before_value != after_value, f"{field_name} should have changed"
    return True
