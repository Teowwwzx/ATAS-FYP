import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database.database import get_db
from app.models.user_model import User, UserStatus, Role
from app.models.profile_model import Profile, ProfileVisibility
from app.core.security import get_password_hash
from app.services.user_service import assign_role_to_user


def test_profiles_discover_pagination(client: TestClient, db: Session):
    if db.query(Role).filter(Role.name == "expert").first() is None:
        db.add(Role(name="expert"))
        db.commit()

    emails = []
    for i in range(12):
        email = f"expert-{uuid.uuid4().hex[:8]}@example.com"
        emails.append(email)
        u = User(
            email=email,
            password=get_password_hash("pw"),
            is_verified=True,
            status=UserStatus.active,
            referral_code=uuid.uuid4().hex[:8],
        )
        db.add(u)
        db.flush()
        assign_role_to_user(db, u, "expert")
        db.add(Profile(user_id=u.id, full_name=f"Expert {i}", visibility=ProfileVisibility.public))
        db.refresh(u)
    db.commit()

    h = client.post("/api/v1/auth/login", data={"username": emails[0], "password": "pw"})
    assert h.status_code == 200
    token = h.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    g = client.get("/api/v1/profiles/discover", params={"page": 1, "page_size": 5})
    assert g.status_code == 200
    assert len(g.json()) == 5
    g2 = client.get("/api/v1/profiles/discover", params={"page": 2, "page_size": 5})
    assert g2.status_code == 200
    assert len(g2.json()) >= 5
