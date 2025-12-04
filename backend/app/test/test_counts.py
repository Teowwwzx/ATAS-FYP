import uuid
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user_model import User, UserStatus, Role
from app.core.security import get_password_hash
from app.models.profile_model import Profile, ProfileVisibility
from app.models.organization_model import OrganizationVisibility, OrganizationType
from app.services.user_service import assign_role_to_user


def test_counts_profiles_events_orgs(client: TestClient, db: Session):
    if db.query(Role).filter(Role.name == "expert").first() is None:
        db.add(Role(name="expert"))
        db.commit()
    if db.query(Role).filter(Role.name == "admin").first() is None:
        db.add(Role(name="admin"))
        db.commit()

    # Profiles
    for i in range(3):
        u = User(
            email=f"count-exp-{uuid.uuid4().hex[:8]}@example.com",
            password=get_password_hash("pw"),
            is_verified=True,
            status=UserStatus.active,
            referral_code=uuid.uuid4().hex[:8],
        )
        db.add(u)
        db.flush()
        assign_role_to_user(db, u, "expert")
        db.add(Profile(user_id=u.id, full_name=f"Exp {i}", visibility=ProfileVisibility.public))
    db.commit()
    rp = client.get("/api/v1/profiles/discover/count")
    assert rp.status_code == 200
    assert rp.json()["total_count"] >= 3

    # Organizations
    admin = User(
        email=f"count-admin-{uuid.uuid4().hex[:8]}@example.com",
        password=get_password_hash("pw"),
        is_verified=True,
        status=UserStatus.active,
        referral_code=uuid.uuid4().hex[:8],
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    assign_role_to_user(db, admin, "admin")

    from app.main import app
    r = client.post("/api/v1/auth/login", data={"username": admin.email, "password": "pw"})
    assert r.status_code == 200
    headers = {"Authorization": f"Bearer {r.json()['access_token']}"}

    for i in range(2):
        body = {
            "owner_id": str(admin.id),
            "name": f"CountOrg {i}",
            "type": OrganizationType.community.value,
            "visibility": OrganizationVisibility.public.value,
        }
        cr = client.post("/api/v1/organizations", json=body, headers=headers)
        assert cr.status_code == 200
    ro = client.get("/api/v1/organizations/count")
    assert ro.status_code == 200
    assert ro.json()["total_count"] >= 2

    # Events
    user = User(
        email=f"count-user-{uuid.uuid4().hex[:8]}@example.com",
        password=get_password_hash("pw"),
        is_verified=True,
        status=UserStatus.active,
        referral_code=uuid.uuid4().hex[:8],
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    ru = client.post("/api/v1/auth/login", data={"username": user.email, "password": "pw"})
    assert ru.status_code == 200
    hu = {"Authorization": f"Bearer {ru.json()['access_token']}"}

    for i in range(4):
        start = datetime.now(timezone.utc) + timedelta(days=3+i)
        end = start + timedelta(hours=1)
        body = {
            "title": f"CountEvent {i}",
            "format": "workshop",
            "start_datetime": start.isoformat(),
            "end_datetime": end.isoformat(),
            "registration_type": "free",
            "visibility": "public",
        }
        ce = client.post("/api/v1/events", json=body, headers=hu)
        assert ce.status_code == 200
    re = client.get("/api/v1/events/count", params={"upcoming": True})
    assert re.status_code == 200
    assert re.json()["total_count"] >= 4

