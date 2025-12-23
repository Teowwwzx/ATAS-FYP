from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.database.database import get_db
from app.dependencies import get_current_user
from app.models.user_model import User, UserStatus
import uuid

def create_user(db: Session, email: str) -> User:
    u = User(email=email, password="x", is_verified=True, status=UserStatus.active, referral_code=uuid.uuid4().hex[:8])
    db.add(u)
    db.commit()
    db.refresh(u)
    return u

def override_current_user(user: User):
    def _dep():
        return user
    return _dep

def test_invite_existing_participant_conflict(client: TestClient, db: Session):
    organizer = create_user(db, "organizer_conflict@example.com")
    invitee = create_user(db, "invitee_conflict@example.com")

    app.dependency_overrides[get_current_user] = override_current_user(organizer)
    
    # Create event
    r = client.post("/api/v1/events", json={
        "title": "Conflict Test Event",
        "description": "Testing invite conflict",
        "format": "seminar",
        "start_datetime": "2025-12-25T10:00:00",
        "end_datetime": "2025-12-25T12:00:00",
        "registration_type": "free",
        "visibility": "public",
        "max_participant": 10
    })
    assert r.status_code == 200, r.text
    event_id = r.json()["id"]

    # 1. Invite user (First time - should succeed)
    r = client.post(f"/api/v1/events/{event_id}/participants", json={
        "user_id": str(invitee.id),
        "role": "audience",
        "description": "First invite"
    })
    assert r.status_code == 200, r.text
    
    # 2. Invite same user again (Same role - should fail with 409)
    r = client.post(f"/api/v1/events/{event_id}/participants", json={
        "user_id": str(invitee.id),
        "role": "audience",
        "description": "Second invite"
    })
    assert r.status_code == 409, f"Expected 409, got {r.status_code}: {r.text}"
    assert "User is already a participant" in r.json()["detail"]

    # 3. Invite same user (Different role - should succeed/update)
    r = client.post(f"/api/v1/events/{event_id}/participants", json={
        "user_id": str(invitee.id),
        "role": "speaker",
        "description": "Promote to speaker"
    })
    assert r.status_code == 200, r.text
    assert r.json()["role"] == "speaker"

    app.dependency_overrides.clear()
