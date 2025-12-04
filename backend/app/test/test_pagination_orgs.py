import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user_model import User, UserStatus, Role
from app.core.security import get_password_hash
from app.models.organization_model import OrganizationVisibility, OrganizationType


def test_orgs_pagination(client: TestClient, db: Session):
    if db.query(Role).filter(Role.name == "admin").first() is None:
        db.add(Role(name="admin"))
        db.commit()

    admin = User(
        email=f"orgs-{uuid.uuid4().hex[:8]}@example.com",
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

    r = client.post("/api/v1/auth/login", data={"username": admin.email, "password": "pw"})
    assert r.status_code == 200
    headers = {"Authorization": f"Bearer {r.json()['access_token']}"}

    for i in range(5):
        body = {
            "owner_id": str(admin.id),
            "name": f"Club {i}",
            "type": OrganizationType.community.value,
            "visibility": OrganizationVisibility.public.value,
        }
        cr = client.post("/api/v1/organizations", json=body, headers=headers)
        assert cr.status_code == 200, cr.text

    l1 = client.get("/api/v1/organizations", params={"page": 1, "page_size": 2})
    assert l1.status_code == 200
    assert len(l1.json()) == 2
    l2 = client.get("/api/v1/organizations", params={"page": 3, "page_size": 2})
    assert l2.status_code == 200
    assert len(l2.json()) >= 1

