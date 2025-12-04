import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

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


def test_admin_verify_revoke_expert(client: TestClient, db: Session):
    try:
        # Ensure roles
        for rn in ["admin", "expert"]:
            if db.query(Role).filter(Role.name == rn).first() is None:
                db.add(Role(name=rn))
        db.commit()

        # Create admin
        admin = User(
            email="admin_verify@example.com",
            password=get_password_hash("pw"),
            is_verified=True,
            status=UserStatus.active,
            referral_code=uuid.uuid4().hex[:8],
        )
        db.add(admin)
        db.flush()
        # Assign admin role
        from app.services.user_service import assign_role_to_user
        assign_role_to_user(db, admin, "admin")
        db.commit()
        db.refresh(admin)

        ha = auth_headers(client, admin.email, "pw")

        # Create normal user
        user = User(
            email="user_verify@example.com",
            password=get_password_hash("pw"),
            is_verified=True,
            status=UserStatus.active,
            referral_code=uuid.uuid4().hex[:8],
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Verify expert via endpoint
        r1 = client.post(f"/api/v1/users/{user.id}/expert/verify", headers=ha)
        assert r1.status_code == 200, r1.text
        db.refresh(user)
        assert any(role.name == "expert" for role in user.roles)

        # Revoke expert via endpoint
        r2 = client.delete(f"/api/v1/users/{user.id}/expert/verify", headers=ha)
        assert r2.status_code == 200, r2.text
        db.refresh(user)
        assert not any(role.name == "expert" for role in user.roles)
    finally:
        db.close()
