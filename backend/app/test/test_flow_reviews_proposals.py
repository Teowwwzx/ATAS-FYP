from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import uuid
from datetime import datetime, timedelta, timezone

from app.main import app
from app.database.database import get_db
from app.models.user_model import User, UserStatus
from app.core.security import get_password_hash
from app.models.event_model import EventParticipantRole, EventParticipantStatus


def setup_db():
    for dep, func in app.dependency_overrides.items():
        if dep is get_db:
            gen = func()
            db = next(gen)
            return db
    raise RuntimeError("get_db override not found")


def auth_headers(client: TestClient, email: str, password: str):
    resp = client.post("/api/v1/auth/login", data={"username": email, "password": password})
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def create_user(db: Session, email: str, password: str) -> User:
    u = User(email=email, password=get_password_hash(password), is_verified=True, status=UserStatus.active, referral_code=uuid.uuid4().hex[:8])
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def create_event(client: TestClient, organizer: User, start: datetime, end: datetime):
    headers = auth_headers(client, organizer.email, "pw")
    body = {
        "title": "Flow Test Event",
        "format": "workshop",
        "start_datetime": start.isoformat(),
        "end_datetime": end.isoformat(),
        "registration_type": "free",
        "visibility": "public",
    }
    r = client.post("/api/v1/events", json=body, headers=headers)
    assert r.status_code == 200
    eid = r.json()["id"]
    # publish
    pr = client.put(f"/api/v1/events/{eid}/publish", headers=headers)
    assert pr.status_code == 200
    return eid, headers


def test_review_requires_event_end(client: TestClient):
    db = setup_db()
    try:
        org = create_user(db, f"org{uuid.uuid4().hex[:6]}@example.com", "pw")
        speaker = create_user(db, f"spk{uuid.uuid4().hex[:6]}@example.com", "pw")
        eid_future, h_org = create_event(client, org, datetime.now(timezone.utc) + timedelta(days=1), datetime.now(timezone.utc) + timedelta(days=2))
        eid_past, _ = create_event(client, org, datetime.now(timezone.utc) - timedelta(days=2), datetime.now(timezone.utc) - timedelta(days=1))

        # Invite speaker and accept
        ir = client.post(f"/api/v1/events/{eid_past}/participants", json={"user_id": str(speaker.id), "role": "speaker"}, headers=h_org)
        assert ir.status_code == 200
        hs = auth_headers(client, speaker.email, "pw")
        rr = client.put(f"/api/v1/events/{eid_past}/participants/me/status", json={"status": "accepted"}, headers=hs)
        assert rr.status_code == 200

        # Attempt review before end (future event) should fail
        r1 = client.post("/api/v1/reviews", json={"event_id": eid_future, "reviewee_id": str(speaker.id), "rating": 5}, headers=h_org)
        assert r1.status_code == 400

        # Review after end (past event) should succeed
        r2 = client.post("/api/v1/reviews", json={"event_id": eid_past, "reviewee_id": str(speaker.id), "rating": 4, "comment": "Good talk"}, headers=h_org)
        assert r2.status_code == 200
    finally:
        db.close()


def test_speaker_can_create_proposal_and_notifications(client: TestClient):
    db = setup_db()
    try:
        org = create_user(db, f"org{uuid.uuid4().hex[:6]}@example.com", "pw")
        speaker = create_user(db, f"spk{uuid.uuid4().hex[:6]}@example.com", "pw")
        eid, h_org = create_event(client, org, datetime.now(timezone.utc) + timedelta(days=2), datetime.now(timezone.utc) + timedelta(days=3))
        # Invite speaker and accept
        ir = client.post(f"/api/v1/events/{eid}/participants", json={"user_id": str(speaker.id), "role": "speaker"}, headers=h_org)
        assert ir.status_code == 200
        hs = auth_headers(client, speaker.email, "pw")
        rr = client.put(f"/api/v1/events/{eid}/participants/me/status", json={"status": "accepted"}, headers=hs)
        assert rr.status_code == 200

        # Speaker creates proposal
        pr = client.post(f"/api/v1/events/{eid}/proposals", data={"title": "Slides", "description": "Deck"}, headers=hs)
        assert pr.status_code == 200
        proposal_id = pr.json()["id"]

        # Organizer comments; expect notifications to speaker
        cm = client.post(f"/api/v1/events/{eid}/proposals/{proposal_id}/comments", json={"content": "Please add bio slide"}, headers=h_org)
        assert cm.status_code == 200

        # Speaker lists notifications
        ln = client.get("/api/v1/notifications/me", headers=hs)
        assert ln.status_code == 200
        items = ln.json()
        assert any("comment" in i["content"].lower() for i in items)
    finally:
        db.close()

