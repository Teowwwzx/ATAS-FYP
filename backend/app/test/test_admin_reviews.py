import uuid
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user_model import User, UserStatus, Role
from app.core.security import get_password_hash
from app.models.event_model import EventVisibility, Event, EventType, EventParticipantRole
from app.services.user_service import assign_role_to_user


def test_admin_list_and_delete_reviews(client: TestClient, db: Session):
    # Ensure roles
    for rn in ["admin"]:
        if db.query(Role).filter(Role.name == rn).first() is None:
            db.add(Role(name=rn))
            db.commit()

    # Create admin
    admin = User(
        email=f"admin-rev-{uuid.uuid4().hex[:8]}@example.com",
        password=get_password_hash("pw"),
        is_verified=True,
        status=UserStatus.active,
        referral_code=uuid.uuid4().hex[:8],
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    assign_role_to_user(db, admin, "admin")

    r = client.post("/api/v1/auth/login", data={"username": admin.email, "password": "pw"})
    assert r.status_code == 200
    headers_admin = {"Authorization": f"Bearer {r.json()['access_token']}"}

    # Create organizer and participant
    org = User(
        email=f"org-{uuid.uuid4().hex[:8]}@example.com",
        password=get_password_hash("pw"),
        is_verified=True,
        status=UserStatus.active,
        referral_code=uuid.uuid4().hex[:8],
    )
    part = User(
        email=f"part-{uuid.uuid4().hex[:8]}@example.com",
        password=get_password_hash("pw"),
        is_verified=True,
        status=UserStatus.active,
        referral_code=uuid.uuid4().hex[:8],
    )
    db.add_all([org, part])
    db.commit()
    db.refresh(org)
    db.refresh(part)

    # Create ended event
    start = datetime.now(timezone.utc) - timedelta(days=3)
    end = start + timedelta(hours=2)
    ev = Event(
        title="Reviewed Event",
        description="",
        format="workshop",
        type=EventType.online,
        start_datetime=start,
        end_datetime=end,
        registration_type="free",
        visibility=EventVisibility.public,
        organizer_id=org.id,
    )
    db.add(ev)
    db.commit()
    db.refresh(ev)

    # Participant attends (simplify by direct insert into EventParticipant)
    from app.models.event_model import EventParticipant
    db.add(EventParticipant(event_id=ev.id, user_id=part.id, role=EventParticipantRole.audience))
    db.commit()

    # Participant writes review
    rp = client.post("/api/v1/auth/login", data={"username": part.email, "password": "pw"})
    assert rp.status_code == 200
    headers_part = {"Authorization": f"Bearer {rp.json()['access_token']}"}
    rr = client.post("/api/v1/reviews", json={"event_id": str(ev.id), "reviewee_id": str(org.id), "rating": 5, "comment": "Great"}, headers=headers_part)
    assert rr.status_code == 200, rr.text
    rid = rr.json()["id"]

    # Admin list by reviewer and reviewee email
    l = client.get("/api/v1/reviews", params={"reviewer_email": part.email, "reviewee_email": org.email}, headers=headers_admin)
    assert l.status_code == 200
    assert len(l.json()) >= 1

    c = client.get("/api/v1/reviews/count", params={"reviewer_email": part.email}, headers=headers_admin)
    assert c.status_code == 200
    assert c.json()["total_count"] >= 1

    # Admin delete
    d = client.delete(f"/api/v1/reviews/{rid}", headers=headers_admin)
    assert d.status_code == 200

    # Count should be 0 now
    c2 = client.get("/api/v1/reviews/count", params={"reviewer_email": part.email}, headers=headers_admin)
    assert c2.status_code == 200
    assert c2.json()["total_count"] == 0
