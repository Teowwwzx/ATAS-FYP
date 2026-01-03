import pytest
import uuid
from sqlalchemy.orm import Session
from app.models.user_model import User
from app.models.event_model import Event, EventFormat, EventType, EventRegistrationType, EventProposal
from app.core.security import get_password_hash
from datetime import datetime, timedelta

def create_user(db: Session, email=None) -> User:
    if not email:
        email = f"prop_test_{uuid.uuid4()}@example.com"
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
        title="Proposal Event",
        format=EventFormat.seminar,
        type=EventType.physical,
        registration_type=EventRegistrationType.free,
        start_datetime=datetime.now(),
        end_datetime=datetime.now() + timedelta(hours=2)
    )
    db.add(event)
    db.commit()
    return event

def test_event_proposal(db: Session):
    """Test Event Proposal creation"""
    user = create_user(db)
    event = create_event(db, user)
    
    proposal = EventProposal(
        event_id=event.id,
        created_by_user_id=user.id,
        title="My Talk",
        description="I want to speak"
    )
    db.add(proposal)
    db.commit()
    
    assert proposal.id is not None
    assert proposal.title == "My Talk"
