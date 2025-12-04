import uuid
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.database.database import get_db
from app.models.user_model import User, UserStatus
from app.models.event_model import EventParticipantStatus, EventParticipantRole, Event
from app.models.event_model import EventRegistrationStatus
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


def test_join_flow_auto_accept(client: TestClient, db: Session):
    organizer = create_user(db, "organizer_join@example.com")
    attendee = create_user(db, "attendee_join@example.com")

    app.dependency_overrides[get_current_user] = override_current_user(organizer)
    start = datetime.now(timezone.utc) + timedelta(days=1)
    end = start + timedelta(hours=2)
    r = client.post("/api/v1/events", json={
        "title": "Join Test",
        "description": "",
        "format": "seminar",
        "start_datetime": start.isoformat(),
        "end_datetime": end.isoformat(),
        "registration_type": "free",
        "visibility": "public",
        "max_participant": 10
    })
    assert r.status_code == 200, r.text
    event = r.json()
    # publish
    r = client.put(f"/api/v1/events/{event['id']}/publish")
    assert r.status_code == 200, r.text

    # switch to attendee user
    app.dependency_overrides[get_current_user] = override_current_user(attendee)
    r = client.post(f"/api/v1/events/{event['id']}/join")
    assert r.status_code == 200, r.text
    p = r.json()
    assert p["status"] == "accepted"
    app.dependency_overrides.clear()


def test_qr_attendance_marks_attended(client: TestClient, db: Session):
    organizer = create_user(db, "organizer_qr@example.com")
    attendee = create_user(db, "attendee_qr@example.com")

    app.dependency_overrides[get_current_user] = override_current_user(organizer)
    start = datetime.now(timezone.utc) + timedelta(minutes=1)
    end = start + timedelta(minutes=30)
    r = client.post("/api/v1/events", json={
        "title": "QR Test",
        "description": "",
        "format": "seminar",
        "start_datetime": start.isoformat(),
        "end_datetime": end.isoformat(),
        "registration_type": "free",
        "visibility": "public",
        "max_participant": 10
    })
    event = r.json()
    client.put(f"/api/v1/events/{event['id']}/publish")

    # attendee joins (auto-accept)
    app.dependency_overrides[get_current_user] = override_current_user(attendee)
    r = client.post(f"/api/v1/events/{event['id']}/join")
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "accepted"

    # back to organizer to generate QR
    app.dependency_overrides[get_current_user] = override_current_user(organizer)
    qr = client.post(f"/api/v1/events/{event['id']}/attendance/qr").json()
    token = qr["token"]

    # attendee scans
    app.dependency_overrides[get_current_user] = override_current_user(attendee)
    r = client.post("/api/v1/events/attendance/scan", json={"token": token})
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "attended"
    app.dependency_overrides.clear()


def test_scheduler_transitions(client: TestClient, db: Session):
    organizer = create_user(db, "organizer_sched@example.com")
    attendee = create_user(db, "attendee_sched@example.com")

    app.dependency_overrides[get_current_user] = override_current_user(organizer)
    start = datetime.now(timezone.utc) - timedelta(hours=2)
    end = start + timedelta(hours=1)
    r = client.post("/api/v1/events", json={
        "title": "Sched Test",
        "description": "",
        "format": "seminar",
        "start_datetime": start.isoformat(),
        "end_datetime": end.isoformat(),
        "registration_type": "free",
        "visibility": "public",
        "max_participant": 10
    })
    event = r.json()
    client.put(f"/api/v1/events/{event['id']}/publish")

    # attendee joins and remains accepted (but not attended)
    app.dependency_overrides[get_current_user] = override_current_user(attendee)
    client.post(f"/api/v1/events/{event['id']}/join")

    # run scheduler
    app.dependency_overrides[get_current_user] = override_current_user(organizer)
    client.post("/api/v1/events/scheduler/run")

    # confirm event ended and participant absent
    # fetch event participants
    plist = client.get(f"/api/v1/events/{event['id']}/participants").json()
    assert any(p["status"] == "absent" for p in plist), plist
    app.dependency_overrides.clear()

