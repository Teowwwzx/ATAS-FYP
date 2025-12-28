
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user_model import User, UserStatus, Role
from app.core.security import get_password_hash
import uuid
from datetime import datetime, timedelta, timezone

def auth_headers(client: TestClient, email: str, password: str):
    response = client.post("/api/v1/auth/login", data={"username": email, "password": password})
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

from app.models.profile_model import Profile

def create_verified_user(db: Session, email: str, role_name: str = None):
    user = User(
        email=email,
        password=get_password_hash("pw"),
        is_verified=True,
        status=UserStatus.active,
        referral_code=uuid.uuid4().hex[:8]
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create Profile
    profile = Profile(
        user_id=user.id,
        full_name=email.split("@")[0]
    )
    db.add(profile)
    db.commit()
    db.refresh(user)

    if role_name:
        if db.query(Role).filter(Role.name == role_name).first() is None:
            db.add(Role(name=role_name))
            db.commit()
        from app.services.user_service import assign_role_to_user
        assign_role_to_user(db, user, role_name)
        
    return user

def test_quick_booking_flow(client: TestClient, db: Session):
    # 1. Setup Users
    student = create_verified_user(db, f"student_{uuid.uuid4()}@example.com")
    expert = create_verified_user(db, f"expert_{uuid.uuid4()}@example.com", "expert")
    
    headers = auth_headers(client, student.email, "pw")
    
    # 2. Test Booking Creation
    start_time = datetime.now(timezone.utc) + timedelta(days=2)
    end_time = start_time + timedelta(hours=1)
    
    booking_data = {
        "expert_id": str(expert.id),
        "start_datetime": start_time.isoformat(),
        "end_datetime": end_time.isoformat(),
        "title": "My Consultation",
        "message": "Hi, I need advice on my FYP."
    }
    
    resp = client.post("/api/v1/bookings", json=booking_data, headers=headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    
    assert data["expert_id"] == str(expert.id)
    assert data["organizer_id"] == str(student.id)
    assert data["status"] == "pending"
    assert data["conversation_id"] is not None
    
    # 3. Verify Database State
    # Check Event
    from app.models.event_model import Event, EventParticipant, EventParticipantRole
    event = db.query(Event).filter(Event.id == uuid.UUID(data["event_id"])).first()
    assert event is not None
    assert event.title == "My Consultation"
    assert event.visibility.value == "private"
    
    # Check Participants
    parts = db.query(EventParticipant).filter(EventParticipant.event_id == event.id).all()
    assert len(parts) == 2
    
    # Check Expert Invitation
    exp_part = next(p for p in parts if p.user_id == expert.id)
    assert exp_part.role == EventParticipantRole.speaker
    assert exp_part.status.value == "pending"
    
    # Check Conversation
    from app.models.chat_model import Message
    msg = db.query(Message).filter(Message.conversation_id == uuid.UUID(data["conversation_id"])).first()
    assert msg is not None
    assert msg.content == "Hi, I need advice on my FYP."
    
    print("\nQuick Booking Flow Verification Passed!")
