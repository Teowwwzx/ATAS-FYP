from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import uuid

from app.main import app
from app.database.database import get_db
from app.models.user_model import User, UserStatus, Role
from app.core.security import get_password_hash


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


def test_profiles_backfill_creates_missing(client: TestClient):
    db: Session = setup_db()
    try:
        # Ensure admin role
        if db.query(Role).filter(Role.name == "admin").first() is None:
            db.add(Role(name="admin"))
            db.commit()

        # Create admin
        admin = User(
            email="backfill_admin@example.com",
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

        # Create user missing profile
        u = User(
            email="missing_profile@example.com",
            password=get_password_hash("pw"),
            is_verified=True,
            status=UserStatus.active,
            referral_code=uuid.uuid4().hex[:8],
        )
        db.add(u)
        db.commit()
        db.refresh(u)

        client = TestClient(app)
        ha = auth_headers(client, admin.email, "pw")

        # Verify GET returns 404
        r1 = client.get(f"/api/v1/profiles/{u.id}", headers=ha)
        assert r1.status_code == 404

        # Run backfill
        bf = client.post("/api/v1/profiles/backfill", headers=ha)
        assert bf.status_code == 200, bf.text
        assert bf.json()["created"] >= 1

        # Verify GET returns 200
        r2 = client.get(f"/api/v1/profiles/{u.id}", headers=ha)
        assert r2.status_code == 200, r2.text
    finally:
        db.close()

