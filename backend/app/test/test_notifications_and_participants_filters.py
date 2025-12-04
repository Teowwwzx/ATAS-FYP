from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import uuid

from app.main import app
from app.database.database import get_db
from app.models.user_model import User, UserStatus
from app.core.security import get_password_hash
from app.models.event_model import EventParticipantRole


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


def create_event(client: TestClient, organizer: User):
    headers = auth_headers(client, organizer.email, "pw")
    body = {
        "title": "Filter Test Event",
        "format": "workshop",
        "start_datetime": "2030-01-01T10:00:00Z",
        "end_datetime": "2030-01-01T12:00:00Z",
        "registration_type": "free",
        "visibility": "public",
    }
    r = client.post("/api/v1/events", json=body, headers=headers)
    assert r.status_code == 200
    eid = r.json()["id"]
    pr = client.put(f"/api/v1/events/{eid}/publish", headers=headers)
    assert pr.status_code == 200
    return eid, headers


def test_notifications_pagination_unread(client: TestClient):
    db = setup_db()
    try:
        user = create_user(db, f"nuser{uuid.uuid4().hex[:6]}@example.com", "pw")
        headers = auth_headers(client, user.email, "pw")
        # Create some notifications directly
        from app.models.notification_model import Notification, NotificationType
        for i in range(30):
            n = Notification(recipient_id=user.id, actor_id=user.id, type=NotificationType.system, content=f"n{i}")
            db.add(n)
        db.commit()
        # First page default
        r1 = client.get("/api/v1/notifications/me?page=1&page_size=10", headers=headers)
        assert r1.status_code == 200 and len(r1.json()) == 10
        # Mark first as read
        first_id = r1.json()[0]["id"]
        mr = client.put(f"/api/v1/notifications/{first_id}/read", headers=headers)
        assert mr.status_code == 200
        # Unread only
        r2 = client.get("/api/v1/notifications/me?unread_only=true&page_size=100", headers=headers)
        assert r2.status_code == 200 and len(r2.json()) >= 29
    finally:
        db.close()


def test_participants_role_filter(client: TestClient):
    db = setup_db()
    try:
        org = create_user(db, f"org{uuid.uuid4().hex[:6]}@example.com", "pw")
        spk = create_user(db, f"spk{uuid.uuid4().hex[:6]}@example.com", "pw")
        aud = create_user(db, f"aud{uuid.uuid4().hex[:6]}@example.com", "pw")
        eid, h_org = create_event(client, org)
        # Invite and accept speaker
        ir = client.post(f"/api/v1/events/{eid}/participants", json={"user_id": str(spk.id), "role": "speaker"}, headers=h_org)
        assert ir.status_code == 200
        hs = auth_headers(client, spk.email, "pw")
        rr = client.put(f"/api/v1/events/{eid}/participants/me/status", json={"status": "accepted"}, headers=hs)
        assert rr.status_code == 200
        # Audience joins
        ha = auth_headers(client, aud.email, "pw")
        jr = client.post(f"/api/v1/events/{eid}/join", headers=ha)
        assert jr.status_code == 200
        # Filter by role
        lr = client.get(f"/api/v1/events/{eid}/participants?role=speaker", headers=h_org)
        assert lr.status_code == 200 and all(p["role"] == "speaker" for p in lr.json())
    finally:
        db.close()

