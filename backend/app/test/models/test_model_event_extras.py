import pytest
import uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.user_model import User
from app.models.event_model import (
    Event, EventFormat, EventType, EventRegistrationType,
    EventReminder, EventChecklistItem, EventPicture, ChecklistVisibility
)
from app.core.security import get_password_hash

def create_user(db: Session, email=None) -> User:
    if not email:
        email = f"event_extra_{uuid.uuid4()}@example.com"
    user = User(
        email=email,
        password=get_password_hash("test"),
        referral_code=uuid.uuid4().hex[:8],
        is_dashboard_pro=False
    )
    db.add(user)
    db.commit()
    return user

def create_event(db: Session, user: User) -> Event:
    event = Event(
        organizer_id=user.id,
        title="Extra Event",
        format=EventFormat.seminar,
        type=EventType.physical,
        registration_type=EventRegistrationType.free,
        start_datetime=datetime.now(),
        end_datetime=datetime.now() + timedelta(hours=2)
    )
    db.add(event)
    db.commit()
    return event

def test_event_reminder(db: Session):
    """Test Event Reminder creation"""
    user = create_user(db)
    event = create_event(db, user)
    
    reminder = EventReminder(
        event_id=event.id,
        user_id=user.id,
        option="one_day",
        remind_at=datetime.now()
    )
    db.add(reminder)
    db.commit()
    
    assert reminder.id is not None
    assert reminder.is_sent is False

def test_event_checklist(db: Session):
    """Test Event Checklist Item"""
    user = create_user(db)
    event = create_event(db, user)
    
    item = EventChecklistItem(
        event_id=event.id,
        created_by_user_id=user.id,
        title="Setup projector",
        visibility=ChecklistVisibility.internal
    )
    db.add(item)
    db.commit()
    
    assert item.id is not None
    assert item.is_completed is False

def test_event_picture(db: Session):
    """Test Event Picture"""
    user = create_user(db)
    event = create_event(db, user)
    
    pic = EventPicture(
        event_id=event.id,
        url="http://img.com/1.jpg",
        caption="Fun times"
    )
    db.add(pic)
    db.commit()
    
    assert pic.id is not None
    assert pic.caption == "Fun times"
