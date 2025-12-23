import uuid
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database.database import get_db
from app.models.user_model import User, UserStatus, Role
from app.core.security import get_password_hash
from app.models.organization_model import OrganizationVisibility, OrganizationType


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


def test_events_and_organizations_filters(client: TestClient, db: Session):
    try:
        # Ensure admin role
        if db.query(Role).filter(Role.name == "admin").first() is None:
            db.add(Role(name="admin"))
        db.commit()

        # Admin user for org create
        admin = User(
            email="filters_admin@example.com",
            password=get_password_hash("pw"),
            is_verified=True,
            status=UserStatus.active,
            referral_code=uuid.uuid4().hex[:8],
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        from app.services.user_service import assign_role_to_user
        assign_role_to_user(db, admin, "admin")

        ha = auth_headers(client, admin.email, "pw")

        # Create organization
        org_body = {
            "owner_id": str(admin.id),
            "name": "AI Club",
            "description": "",
            "type": OrganizationType.community.value,
            "visibility": OrganizationVisibility.public.value,
        }
        ro = client.post("/api/v1/organizations", json=org_body, headers=ha)
        assert ro.status_code == 200, ro.text

        # List with filters
        lo = client.get("/api/v1/organizations", params={"name": "AI", "visibility": OrganizationVisibility.public.value})
        assert lo.status_code == 200, lo.text
        assert any("AI Club" == i["name"] for i in lo.json())

        # Normal user for event
        user = User(
            email="filters_user@example.com",
            password=get_password_hash("pw"),
            is_verified=True,
            status=UserStatus.active,
            referral_code=uuid.uuid4().hex[:8],
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        hu = auth_headers(client, user.email, "pw")

        start = datetime.now(timezone.utc) + timedelta(days=2)
        end = start + timedelta(hours=1)
        body = {
            "title": "Discover Workshop",
            "description": "",
            "format": "workshop",
            "start_datetime": start.isoformat(),
            "end_datetime": end.isoformat(),
            "registration_type": "free",
            "visibility": "public",
        }
        re = client.post("/api/v1/events", json=body, headers=hu)
        assert re.status_code == 200, re.text
        eid = re.json()["id"]
        client.put(f"/api/v1/events/{eid}/publish", headers=hu)

        # Filter events by q_text
        le = client.get("/api/v1/events", params={"q_text": "Workshop", "upcoming": True})
        assert le.status_code == 200, le.text
        assert any("Discover Workshop" == i["title"] for i in le.json())
    finally:
        db.close()
