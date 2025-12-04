import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user_model import User, UserStatus, Role
from app.core.security import get_password_hash
from app.services.user_service import assign_role_to_user
from app.models.organization_model import OrganizationVisibility, OrganizationType


def test_admin_org_audit(client: TestClient, db: Session):
    # Admin
    if db.query(Role).filter(Role.name == "admin").first() is None:
        db.add(Role(name="admin"))
        db.commit()
    admin = User(
        email=f"org-audit-admin-{uuid.uuid4().hex[:8]}@example.com",
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
    headers = {"Authorization": f"Bearer {r.json()['access_token']}"}

    # Create org
    body = {
        "owner_id": str(admin.id),
        "name": "AuditOrg",
        "type": OrganizationType.community.value,
        "visibility": OrganizationVisibility.public.value,
    }
    co = client.post("/api/v1/organizations", json=body, headers=headers)
    assert co.status_code == 200
    org_id = co.json()["id"]

    # Update
    uo = client.put(f"/api/v1/organizations/{org_id}", json={"name": "AuditOrg2"}, headers=headers)
    assert uo.status_code == 200

    # Delete
    do = client.delete(f"/api/v1/organizations/{org_id}", headers=headers)
    assert do.status_code == 204

    # Logs
    l = client.get("/api/v1/admin/audit-logs", headers=headers)
    assert l.status_code == 200
    data = l.json()
    assert any(x["action"] == "organization.create" for x in data)
    assert any(x["action"] == "organization.update" for x in data)
    assert any(x["action"] == "organization.delete" for x in data)


def test_event_audit(client: TestClient, db: Session):
    # Organizer
    org = User(
        email=f"event-audit-org-{uuid.uuid4().hex[:8]}@example.com",
        password=get_password_hash("pw"),
        is_verified=True,
        status=UserStatus.active,
        referral_code=uuid.uuid4().hex[:8],
    )
    db.add(org)
    db.commit()
    db.refresh(org)
    r = client.post("/api/v1/auth/login", data={"username": org.email, "password": "pw"})
    headers_org = {"Authorization": f"Bearer {r.json()['access_token']}"}

    # Create event
    from datetime import datetime, timedelta, timezone
    start = datetime.now(timezone.utc) + timedelta(days=2)
    end = start + timedelta(hours=1)
    body = {
        "title": "AuditEvent",
        "format": "workshop",
        "start_datetime": start.isoformat(),
        "end_datetime": end.isoformat(),
        "registration_type": "free",
        "visibility": "public",
    }
    ce = client.post("/api/v1/events", json=body, headers=headers_org)
    assert ce.status_code == 200
    event_id = ce.json()["id"]

    # Publish and manage registration
    pub = client.put(f"/api/v1/events/{event_id}/publish", headers=headers_org)
    assert pub.status_code == 200
    op = client.put(f"/api/v1/events/{event_id}/registration/open", headers=headers_org)
    assert op.status_code == 200
    cl = client.put(f"/api/v1/events/{event_id}/registration/close", headers=headers_org)
    assert cl.status_code == 200
    un = client.put(f"/api/v1/events/{event_id}/unpublish", headers=headers_org)
    assert un.status_code == 200

    # Create a participant and remove
    # Join as organizer again is prevented; create another user participant via direct insert
    from app.models.event_model import EventParticipant, EventParticipantRole, EventParticipantStatus
    user2 = User(
        email=f"event-audit-part-{uuid.uuid4().hex[:8]}@example.com",
        password=get_password_hash("pw"),
        is_verified=True,
        status=UserStatus.active,
        referral_code=uuid.uuid4().hex[:8],
    )
    db.add(user2)
    db.commit()
    db.refresh(user2)
    link = EventParticipant(event_id=uuid.UUID(event_id), user_id=user2.id, role=EventParticipantRole.audience, status=EventParticipantStatus.accepted)
    db.add(link)
    db.commit()
    db.refresh(link)
    rm = client.delete(f"/api/v1/events/{event_id}/participants/{link.id}", headers=headers_org)
    assert rm.status_code == 200

    # End event (set end in past)
    from app.models.event_model import Event
    ev = db.query(Event).filter(Event.id == uuid.UUID(event_id)).first()
    from datetime import datetime, timezone, timedelta
    ev.end_datetime = datetime.now(timezone.utc) - timedelta(hours=1)
    db.add(ev)
    db.commit()
    ee = client.post(f"/api/v1/events/{event_id}/end", headers=headers_org)
    assert ee.status_code == 200

    # Delete event
    de = client.delete(f"/api/v1/events/{event_id}", headers=headers_org)
    assert de.status_code == 204

    # Admin can view logs
    if db.query(Role).filter(Role.name == "admin").first() is None:
        db.add(Role(name="admin"))
        db.commit()
    admin = User(
        email=f"event-audit-admin-{uuid.uuid4().hex[:8]}@example.com",
        password=get_password_hash("pw"),
        is_verified=True,
        status=UserStatus.active,
        referral_code=uuid.uuid4().hex[:8],
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    assign_role_to_user(db, admin, "admin")
    ra = client.post("/api/v1/auth/login", data={"username": admin.email, "password": "pw"})
    headers_admin = {"Authorization": f"Bearer {ra.json()['access_token']}"}
    l = client.get("/api/v1/admin/audit-logs", headers=headers_admin)
    assert l.status_code == 200
    data = l.json()
    assert any(x["action"] == "event.publish" for x in data)
    assert any(x["action"] == "event.unpublish" for x in data)
    assert any(x["action"] == "event.registration.open" for x in data)
    assert any(x["action"] == "event.registration.close" for x in data)
    assert any(x["action"] == "event.participant.remove" for x in data)
    assert any(x["action"] == "event.end" for x in data)
    assert any(x["action"] == "event.delete" for x in data)
