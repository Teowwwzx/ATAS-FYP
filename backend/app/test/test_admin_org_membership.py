from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import uuid

from app.main import app
from app.database.database import get_db
from app.models.user_model import User, UserStatus, Role
from app.models.organization_model import Organization, OrganizationRole, OrganizationVisibility
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


def create_user(db: Session, email: str, password: str, roles: list[str] = None) -> User:
    u = User(email=email, password=get_password_hash(password), is_verified=True, status=UserStatus.active, referral_code=uuid.uuid4().hex[:8])
    db.add(u)
    db.commit()
    db.refresh(u)
    if roles:
        for name in roles:
            r = db.query(Role).filter(Role.name == name).first()
            if r is None:
                r = Role(name=name)
                db.add(r)
                db.commit()
                db.refresh(r)
            u.roles.append(r)
        db.commit()
        db.refresh(u)
    return u


def test_admin_membership_crud(client: TestClient):
    db = setup_db()
    try:
        admin = create_user(db, f"orgadmin{uuid.uuid4().hex[:6]}@example.com", "pw", roles=["admin"])
        user = create_user(db, f"member{uuid.uuid4().hex[:6]}@example.com", "pw")
        ha = auth_headers(client, admin.email, "pw")
        hu = auth_headers(client, user.email, "pw")

        org = Organization(owner_id=admin.id, name="Org", visibility=OrganizationVisibility.public)
        db.add(org)
        db.commit()
        db.refresh(org)

        # Non-admin forbidden
        r = client.post(f"/api/v1/organizations/{org.id}/members", json={"user_id": str(user.id), "role": "member"}, headers=hu)
        assert r.status_code == 403

        # Admin add
        r = client.post(f"/api/v1/organizations/{org.id}/members", json={"user_id": str(user.id), "role": "member"}, headers=ha)
        assert r.status_code == 200

        # List
        r = client.get(f"/api/v1/organizations/{org.id}/members", headers=ha)
        assert r.status_code == 200 and any(m["user_id"] == str(user.id) for m in r.json())

        # Update
        r = client.put(f"/api/v1/organizations/{org.id}/members/{user.id}", json={"role": "admin"}, headers=ha)
        assert r.status_code == 200 and r.json()["role"] == "admin"

        # Delete
        r = client.delete(f"/api/v1/organizations/{org.id}/members/{user.id}", headers=ha)
        assert r.status_code == 204
    finally:
        db.close()
