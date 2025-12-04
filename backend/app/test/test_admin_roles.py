import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user_model import User, UserStatus, Role
from app.core.security import get_password_hash
from app.services.user_service import assign_role_to_user


def test_admin_assign_remove_roles(client: TestClient, db: Session):
    # Ensure admin role
    if db.query(Role).filter(Role.name == "admin").first() is None:
        db.add(Role(name="admin"))
        db.commit()

    # Create admin
    admin = User(
        email=f"roles-admin-{uuid.uuid4().hex[:8]}@example.com",
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

    # Create user
    user = User(
        email=f"roles-user-{uuid.uuid4().hex[:8]}@example.com",
        password=get_password_hash("pw"),
        is_verified=True,
        status=UserStatus.active,
        referral_code=uuid.uuid4().hex[:8],
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Assign new role 'moderator' (auto-create)
    a = client.post(f"/api/v1/users/{user.id}/roles/moderator", headers=headers)
    assert a.status_code == 200
    db.refresh(user)
    assert any(r.name == "moderator" for r in user.roles)

    # Remove role
    d = client.delete(f"/api/v1/users/{user.id}/roles/moderator", headers=headers)
    assert d.status_code == 200
    db.refresh(user)
    assert not any(r.name == "moderator" for r in user.roles)

