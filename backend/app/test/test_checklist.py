import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.database.database import get_db
from app.models.user_model import User, UserStatus
from app.models.event_model import EventParticipant, EventParticipantRole
from app.schemas.event_schema import EventCreate
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

def test_checklist_crud(client: TestClient, db: Session):
    organizer = create_user(db, "org_checklist@example.com")
    app.dependency_overrides[get_current_user] = override_current_user(organizer)

    rce = client.post("/api/v1/events", json={
        "title": "Checklist Event",
        "description": "Desc",
        "logo_url": None,
        "cover_url": None,
        "format": "webinar",
        "type": "online",
        "start_datetime": "2025-01-01T00:00:00Z",
        "end_datetime": "2025-01-02T00:00:00Z",
        "registration_type": "free",
        "visibility": "public",
        "max_participant": None,
        "venue_place_id": None,
        "venue_remark": None,
        "remark": None,
    })
    assert rce.status_code == 200
    event_id = rce.json()["id"]

    rlist_empty = client.get(f"/api/v1/events/{event_id}/checklist")
    assert rlist_empty.status_code == 200
    assert rlist_empty.json() == []

    rcreate = client.post(f"/api/v1/events/{event_id}/checklist", json={
        "title": "Book venue",
        "description": "Confirm booking",
    })
    assert rcreate.status_code == 200
    item_id = rcreate.json()["id"]

    rlist = client.get(f"/api/v1/events/{event_id}/checklist")
    assert rlist.status_code == 200
    assert len(rlist.json()) == 1

    rupdate = client.put(f"/api/v1/events/{event_id}/checklist/{item_id}", json={
        "is_completed": True,
        "title": "Book venue (paid)",
    })
    assert rupdate.status_code == 200
    assert rupdate.json()["is_completed"] is True
    assert rupdate.json()["title"] == "Book venue (paid)"

    rdelete = client.delete(f"/api/v1/events/{event_id}/checklist/{item_id}")
    assert rdelete.status_code == 200

    app.dependency_overrides.clear()
