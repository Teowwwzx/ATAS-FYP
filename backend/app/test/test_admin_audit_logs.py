import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user_model import User, UserStatus, Role
from app.core.security import get_password_hash
from app.services.user_service import assign_role_to_user


def test_audit_logs_created_and_listed(client: TestClient, db: Session):
    # Ensure admin role
    if db.query(Role).filter(Role.name == "admin").first() is None:
        db.add(Role(name="admin"))
        db.commit()

    # Admin
    admin = User(
        email=f"audit-admin-{uuid.uuid4().hex[:8]}@example.com",
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
    headers = {"Authorization": f"Bearer {r.json()['access_token']}"}

    # Target user
    user = User(
        email=f"audit-user-{uuid.uuid4().hex[:8]}@example.com",
        password=get_password_hash("pw"),
        is_verified=True,
        status=UserStatus.active,
        referral_code=uuid.uuid4().hex[:8],
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Perform actions
    s = client.post(f"/api/v1/users/{user.id}/suspend", headers=headers)
    assert s.status_code == 200
    a = client.post(f"/api/v1/users/{user.id}/activate", headers=headers)
    assert a.status_code == 200
    ra = client.post(f"/api/v1/users/{user.id}/roles/moderator", headers=headers)
    assert ra.status_code == 200
    rr = client.delete(f"/api/v1/users/{user.id}/roles/moderator", headers=headers)
    assert rr.status_code == 200

    # List logs
    l = client.get("/api/v1/admin/audit-logs", headers=headers)
    assert l.status_code == 200
    data = l.json()
    assert any(x["action"] == "user.suspend" for x in data)
    assert any(x["action"] == "user.activate" for x in data)
    assert any(x["action"] == "user.role.assign" for x in data)
    assert any(x["action"] == "user.role.remove" for x in data)

