import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user_model import User, UserStatus, Role
from app.core.security import get_password_hash
from app.models.profile_model import Profile, ProfileVisibility
from app.services.user_service import assign_role_to_user


def test_admin_users_filters_and_status(client: TestClient, db: Session):
    # Ensure admin role
    if db.query(Role).filter(Role.name == "admin").first() is None:
        db.add(Role(name="admin"))
        db.commit()

    # Create admin
    admin = User(
        email=f"admin-{uuid.uuid4().hex[:8]}@example.com",
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

    # Create users with profiles and statuses
    emails = []
    for i, st in enumerate([UserStatus.active, UserStatus.inactive, UserStatus.suspended]):
        email = f"user-{uuid.uuid4().hex[:8]}@example.com"
        emails.append(email)
        u = User(
            email=email,
            password=get_password_hash("pw"),
            is_verified=True,
            status=st,
            referral_code=uuid.uuid4().hex[:8],
        )
        db.add(u)
        db.flush()
        db.add(Profile(user_id=u.id, full_name=f"Name {i}", visibility=ProfileVisibility.public))
    db.commit()

    # Filter by email substring
    l = client.get("/api/v1/users", params={"email": "user-"}, headers=headers)
    assert l.status_code == 200
    assert len(l.json()) >= 3

    # Filter count by status
    c = client.get("/api/v1/users/search/count", params={"status": UserStatus.suspended.value}, headers=headers)
    assert c.status_code == 200
    assert c.json()["total_count"] >= 1

    # Filter by name (via profile)
    l2 = client.get("/api/v1/users", params={"name": "Name"}, headers=headers)
    assert l2.status_code == 200
    assert len(l2.json()) >= 3

    # Suspend and activate
    # Find one active user
    u_active = db.query(User).filter(User.email == emails[0]).first()
    s = client.post(f"/api/v1/users/{u_active.id}/suspend", headers=headers)
    assert s.status_code == 200
    db.refresh(u_active)
    assert u_active.status == UserStatus.suspended

    a = client.post(f"/api/v1/users/{u_active.id}/activate", headers=headers)
    assert a.status_code == 200
    db.refresh(u_active)
    assert u_active.status == UserStatus.active
