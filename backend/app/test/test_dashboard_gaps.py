import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.database.database import get_db
from app.models.user_model import User, UserStatus
from app.models.profile_model import Profile, ProfileVisibility
from app.models.event_model import EventParticipant, EventParticipantRole
from app.schemas.event_schema import EventCreate
from app.dependencies import get_current_user

def create_user(db: Session, email: str) -> User:
    unique_email = f"{uuid.uuid4().hex[:8]}_{email}"
    u = User(email=unique_email, password="x", is_verified=True, status=UserStatus.active, referral_code=str(uuid.uuid4()))
    db.add(u)
    db.commit()
    db.refresh(u)
    return u

def create_profile(db: Session, user: User, name: str) -> Profile:
    p = Profile(user_id=user.id, full_name=name, visibility=ProfileVisibility.public)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p

def override_current_user(user: User):
    def _dep():
        return user
    return _dep

def test_profile_search_email_and_name(client: TestClient, db: Session):
    user = create_user(db, "alice@example.com")
    create_profile(db, user, "Alice Doe")
    r1 = client.get("/api/v1/profiles/find", params={"email": "alice@example.com"})
    assert r1.status_code == 200
    assert len(r1.json()) == 1
    r2 = client.get("/api/v1/profiles/find", params={"name": "Alice"})
    assert r2.status_code == 200
    assert len(r2.json()) >= 1

def test_event_proposal_create_list_and_comment(client: TestClient, db: Session):
    organizer = create_user(db, "org@example.com")
    app.dependency_overrides[get_current_user] = override_current_user(organizer)
    ec = EventCreate(
        title="Test Event",
        description="Desc",
        logo_url=None,
        cover_url=None,
        format="webinar",
        type="online",
        start_datetime="2025-01-01T00:00:00Z",
        end_datetime="2025-01-02T00:00:00Z",
        registration_type="free",
        visibility="public",
        max_participant=None,
        venue_place_id=None,
        venue_remark=None,
        remark=None,
    )
    rce = client.post("/api/v1/events", json={
        "title": ec.title,
        "description": ec.description,
        "logo_url": ec.logo_url,
        "cover_url": ec.cover_url,
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
    r = client.post(f"/api/v1/events/{event_id}/proposals", json={"file_url": "http://example.com/p.pdf"})
    assert r.status_code == 200
    pid = r.json()["id"]
    rlist = client.get(f"/api/v1/events/{event_id}/proposals")
    assert rlist.status_code == 200
    assert len(rlist.json()) >= 1
    speaker = create_user(db, "speaker@example.com")
    ep = EventParticipant(event_id=uuid.UUID(event_id), user_id=speaker.id, role=EventParticipantRole.speaker, description=None, join_method=None, status=None)
    db.add(ep)
    db.commit()
    app.dependency_overrides[get_current_user] = override_current_user(speaker)
    rc = client.post(f"/api/v1/events/{event_id}/proposals/{pid}/comments", json={"content": "Looks good"})
    assert rc.status_code == 200
    rcl = client.get(f"/api/v1/events/{event_id}/proposals/{pid}/comments")
    assert rcl.status_code == 200
    assert len(rcl.json()) >= 1
    app.dependency_overrides.clear()
