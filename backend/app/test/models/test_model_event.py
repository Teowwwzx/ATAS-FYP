import pytest
import uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.user_model import User
from app.models.event_model import (
    Event, EventFormat, EventType, EventRegistrationType, 
    EventStatus, EventParticipant, EventParticipantRole, 
    EventCategory, Category
)
from app.core.security import get_password_hash

def create_user(db: Session, email=None) -> User:
    if not email:
        email = f"event_test_{uuid.uuid4()}@example.com"
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

def test_create_event(db: Session):
    """Test creating an event with minimum required fields"""
    organizer = create_user(db)
    
    start_time = datetime.now() + timedelta(days=1)
    end_time = start_time + timedelta(hours=2)
    
    event = Event(
        organizer_id=organizer.id,
        title="Test Event",
        format=EventFormat.seminar,
        type=EventType.physical,
        registration_type=EventRegistrationType.free,
        start_datetime=start_time,
        end_datetime=end_time
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    
    assert event.id is not None
    assert event.title == "Test Event"
    assert event.status == EventStatus.draft # Default
    assert event.organizer_id == organizer.id

def test_event_participant_relationship(db: Session):
    """Test adding participants to event"""
    organizer = create_user(db)
    start_time = datetime.now()
    event = Event(
        organizer_id=organizer.id,
        title="Participated Event",
        format=EventFormat.seminar,
        type=EventType.online,
        registration_type=EventRegistrationType.free,
        start_datetime=start_time,
        end_datetime=start_time + timedelta(hours=1)
    )
    db.add(event)
    db.commit()
    
    participant_user = create_user(db)
    
    # Add participant via EventParticipant model
    participant = EventParticipant(
        event_id=event.id,
        user_id=participant_user.id,
        role=EventParticipantRole.audience
    )
    db.add(participant)
    db.commit()
    db.refresh(event)
    
    # Verify via relationship?
    # Event doesn't check participants relationship by default, checking model...
    # event_model.py: 
    # Event.participant_count (property)
    # No explicit 'participants' relationship defined on Event in the file view provided?
    # Let me re-read event_model.py.
    # Lines 73-118 (Event class) -> No `participants` = relationship(...) shown in snippet.
    # Line 168: EventParticipant defined.
    # Line 196: event = relationship("Event")
    # BUT, many-to-many or one-to-many from Event side?
    # Often it is backref or explicitly defined.
    # If not defined on Event, we query EventParticipant directly.
    
    count = db.query(EventParticipant).filter(EventParticipant.event_id == event.id).count()
    assert count == 1

def test_event_category_relationship(db: Session):
    """Test adding categories to event"""
    organizer = create_user(db)
    start_time = datetime.now()
    event = Event(
        organizer_id=organizer.id,
        title="Categorized Event",
        format=EventFormat.seminar,
        type=EventType.online,
        registration_type=EventRegistrationType.free,
        start_datetime=start_time,
        end_datetime=start_time + timedelta(hours=1)
    )
    db.add(event)
    db.commit()
    
    # Create category
    category = Category(name="Tech")
    db.add(category)
    db.commit()
    
    # Link
    event_cat = EventCategory(event_id=event.id, category_id=category.id)
    db.add(event_cat)
    db.commit()
    
    # Verify
    assert db.query(EventCategory).filter(EventCategory.event_id == event.id).first() is not None

def test_delete_event(db: Session):
    """Test deleting event"""
    organizer = create_user(db)
    start_time = datetime.now()
    event = Event(
        organizer_id=organizer.id,
        title="Delete Me",
        format=EventFormat.seminar,
        type=EventType.online,
        registration_type=EventRegistrationType.free,
        start_datetime=start_time,
        end_datetime=start_time + timedelta(hours=1)
    )
    db.add(event)
    db.commit()
    
    event_id = event.id
    db.delete(event)
    db.commit()
    
    assert db.query(Event).filter(Event.id == event_id).first() is None
