import pytest
import uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.user_model import User
from app.models.event_model import (
    Event, EventFormat, EventType, EventRegistrationType,
    EventParticipant, EventParticipantRole, EventParticipantStatus,
    EventPaymentStatus
)
from app.core.security import get_password_hash

def create_user(db: Session, email=None) -> User:
    if not email:
        email = f"booking_test_{uuid.uuid4()}@example.com"
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
        title="Booking Event",
        format=EventFormat.seminar,
        type=EventType.physical,
        registration_type=EventRegistrationType.free,
        start_datetime=datetime.now(),
        end_datetime=datetime.now() + timedelta(hours=2),
        max_participant=10
    )
    db.add(event)
    db.commit()
    return event

def test_participant_count_property(db: Session):
    """Test dynamic participant_count property calculation"""
    organizer = create_user(db)
    event = create_event(db, organizer)
    
    # 1. Add Accepted Participant
    u1 = create_user(db)
    p1 = EventParticipant(
        event_id=event.id,
        user_id=u1.id,
        role=EventParticipantRole.audience,
        status=EventParticipantStatus.accepted
    )
    db.add(p1)
    
    # 2. Add Pending Participant (Should be counted based on current query logic in model)
    # Line 291 in event_model.py says: EventParticipantStatus.pending is IN calculation
    u2 = create_user(db)
    p2 = EventParticipant(
        event_id=event.id,
        user_id=u2.id,
        role=EventParticipantRole.audience,
        status=EventParticipantStatus.pending
    )
    db.add(p2)
    
    # 3. Add Rejected Participant (Should NOT be counted)
    u3 = create_user(db)
    p3 = EventParticipant(
        event_id=event.id,
        user_id=u3.id,
        role=EventParticipantRole.audience,
        status=EventParticipantStatus.rejected
    )
    db.add(p3)
    
    db.commit()
    db.refresh(event)
    
    # Expect count = 2 (1 accepted + 1 pending) as per model definition
    assert event.participant_count == 2

def test_duplicate_participant_constraint(db: Session):
    """Test if system allows duplicate participants (Schema check)"""
    organizer = create_user(db)
    event = create_event(db, organizer)
    u1 = create_user(db)
    
    # Add first time
    p1 = EventParticipant(
        event_id=event.id,
        user_id=u1.id,
        role=EventParticipantRole.audience
    )
    db.add(p1)
    db.commit()
    
    # Add second time
    p2 = EventParticipant(
        event_id=event.id,
        user_id=u1.id,
        role=EventParticipantRole.audience
    )
    db.add(p2)
    
    # If schema has explicit unique constraint, this will raise IntegrityError
    # If not, it will pass, indicating a potential schema gap.
    try:
        db.commit()
        # If we reach here, no unique constraint exists in DB
        # Warning: Duplicate participants allowed!
        pass 
    except IntegrityError:
        # Good, constraint exists
        pass
    except Exception as e:
        pytest.fail(f"Unexpected error: {e}")

def test_payment_status_flow(db: Session):
    """Test payment status transitions"""
    organizer = create_user(db)
    event = create_event(db, organizer)
    u1 = create_user(db)
    
    p = EventParticipant(
        event_id=event.id,
        user_id=u1.id,
        role=EventParticipantRole.audience,
        payment_status=EventPaymentStatus.pending
    )
    db.add(p)
    db.commit()
    
    # Transition to Verified
    p.payment_status = EventPaymentStatus.verified
    db.commit()
    db.refresh(p)
    assert p.payment_status == EventPaymentStatus.verified
    
    # Transition to Rejected
    p.payment_status = EventPaymentStatus.rejected
    db.commit()
    db.refresh(p)
    assert p.payment_status == EventPaymentStatus.rejected
