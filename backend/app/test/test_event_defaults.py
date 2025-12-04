import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.database.database import get_db
from app.models.user_model import User, UserStatus
from app.dependencies import get_current_user

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

def test_event_create_defaults(client: TestClient, db: Session):
    organizer = create_user(db, "org_defaults@example.com")
    app.dependency_overrides[get_current_user] = override_current_user(organizer)

    r = client.post("/api/v1/events", json={
        "title": "Defaults Event",
        "description": "Desc",
        "format": "webinar",
        "start_datetime": "2025-01-01T00:00:00Z",
        "end_datetime": "2025-01-02T00:00:00Z",
        "registration_type": "free",
        "visibility": "public"
    })
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["type"] == "online"
    assert data["venue_place_id"] is not None
    app.dependency_overrides.clear()

