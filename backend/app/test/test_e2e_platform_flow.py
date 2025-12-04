import uuid
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models.user_model import User, UserStatus, Role
from app.core.security import get_password_hash
from app.services.user_service import assign_role_to_user, create_user
from app.schemas.user_schema import UserCreate


def test_e2e_platform_flow(client: TestClient, db: Session):
    # Admin setup
    if db.query(Role).filter(Role.name == "admin").first() is None:
        db.add(Role(name="admin"))
        db.commit()

    admin = create_user(db, UserCreate(email=f"admin-{uuid.uuid4().hex[:8]}@example.com", password="pw"))
    admin.is_verified = True
    admin.status = UserStatus.active
    db.commit()
    db.refresh(admin)
    assign_role_to_user(db, admin, "admin")
    ra = client.post("/api/v1/auth/login", data={"username": admin.email, "password": "pw"})
    assert ra.status_code == 200
    headers_admin = {"Authorization": f"Bearer {ra.json()['access_token']}"}

    # Organizer setup
    organizer = create_user(db, UserCreate(email=f"org-{uuid.uuid4().hex[:8]}@example.com", password="pw"))
    organizer.is_verified = True
    organizer.status = UserStatus.active
    db.commit()
    db.refresh(organizer)
    ro = client.post("/api/v1/auth/login", data={"username": organizer.email, "password": "pw"})
    assert ro.status_code == 200
    headers_org = {"Authorization": f"Bearer {ro.json()['access_token']}"}

    # Participant setup
    participant = create_user(db, UserCreate(email=f"user-{uuid.uuid4().hex[:8]}@example.com", password="pw"))
    participant.is_verified = True
    participant.status = UserStatus.active
    db.commit()
    db.refresh(participant)
    rp = client.post("/api/v1/auth/login", data={"username": participant.email, "password": "pw"})
    assert rp.status_code == 200
    headers_part = {"Authorization": f"Bearer {rp.json()['access_token']}"}

    # Organizer creates event
    start = datetime.now(timezone.utc) + timedelta(days=2)
    end = start + timedelta(hours=2)
    body = {
        "title": "E2E Event",
        "format": "workshop",
        "start_datetime": start.isoformat(),
        "end_datetime": end.isoformat(),
        "registration_type": "free",
        "visibility": "public",
    }
    ce = client.post("/api/v1/events", json=body, headers=headers_org)
    assert ce.status_code == 200
    event_id = ce.json()["id"]

    # Publish and open registration
    pub = client.put(f"/api/v1/events/{event_id}/publish", headers=headers_org)
    assert pub.status_code == 200
    op = client.put(f"/api/v1/events/{event_id}/registration/open", headers=headers_org)
    assert op.status_code == 200

    # Participant joins
    jn = client.post(f"/api/v1/events/{event_id}/join", headers=headers_part)
    assert jn.status_code == 200

    # Participant sets reminder
    rm = client.post(f"/api/v1/events/{event_id}/reminders", json={"option": "one_day"}, headers=headers_part)
    assert rm.status_code == 200

    # Close registration, end event, then participant reviews organizer
    cl = client.put(f"/api/v1/events/{event_id}/registration/close", headers=headers_org)
    assert cl.status_code == 200
    # Move time: set end in past
    from app.models.event_model import Event
    ev = db.query(Event).filter(Event.id == uuid.UUID(event_id)).first()
    ev.end_datetime = datetime.now(timezone.utc) - timedelta(hours=1)
    db.add(ev)
    db.commit()
    ee = client.post(f"/api/v1/events/{event_id}/end", headers=headers_org)
    assert ee.status_code == 200
    rv = client.post("/api/v1/reviews", json={"event_id": event_id, "reviewee_id": str(organizer.id), "rating": 5, "comment": "Excellent"}, headers=headers_part)
    assert rv.status_code == 200

    # Admin lists users with filters and counts
    lu = client.get("/api/v1/users", params={"email": "user-"}, headers=headers_admin)
    assert lu.status_code == 200
    cu = client.get("/api/v1/users/search/count", params={"email": "user-"}, headers=headers_admin)
    assert cu.status_code == 200

    # Admin reviews moderation list/count and delete
    lr = client.get("/api/v1/reviews", params={"reviewer_email": participant.email}, headers=headers_admin)
    assert lr.status_code == 200 and len(lr.json()) >= 1
    rid = lr.json()[0]["id"]
    cr = client.get("/api/v1/reviews/count", params={"reviewer_email": participant.email}, headers=headers_admin)
    assert cr.status_code == 200
    dr = client.delete(f"/api/v1/reviews/{rid}", headers=headers_admin)
    assert dr.status_code == 200

    # Audit logs list
    al = client.get("/api/v1/admin/audit-logs", headers=headers_admin)
    assert al.status_code == 200

