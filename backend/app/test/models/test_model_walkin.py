import pytest
import uuid
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.user_model import User
from app.models.event_model import Event, EventFormat, EventType, EventRegistrationType, EventWalkInToken
from app.core.security import get_password_hash
from datetime import datetime, timedelta

def create_user(db: Session, email=None) -> User:
    if not email:
        email = f"walkin_test_{uuid.uuid4()}@example.com"
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
        title="Walkin Event",
        format=EventFormat.seminar,
        type=EventType.physical,
        registration_type=EventRegistrationType.free,
        start_datetime=datetime.now(),
        end_datetime=datetime.now() + timedelta(hours=2)
    )
    db.add(event)
    db.commit()
    return event

def test_walkin_token(db: Session):
    """Test WalkIn Token creation"""
    user = create_user(db)
    event = create_event(db, user)
    
    token_str = str(uuid.uuid4())
    token = EventWalkInToken(
        event_id=event.id,
        created_by_user_id=user.id,
        token=token_str,
        max_uses=10
    )
    db.add(token)
    db.commit()
    
    assert token.id is not None
    assert token.token == token_str
    assert token.current_uses == 0

def test_walkin_token_uniqueness(db: Session):
    """Test WalkIn Token Uniqueness"""
    user = create_user(db)
    event = create_event(db, user)
    token_str = "UNIQUE_TOKEN"
    
    t1 = EventWalkInToken(
        event_id=event.id,
        created_by_user_id=user.id,
        token=token_str
    )
    db.add(t1)
    db.commit()
    
    t2 = EventWalkInToken(
        event_id=event.id,
        created_by_user_id=user.id,
        token=token_str
    )
    db.add(t2)
    
    with pytest.raises(IntegrityError):
        db.commit()
    
    db.rollback()
