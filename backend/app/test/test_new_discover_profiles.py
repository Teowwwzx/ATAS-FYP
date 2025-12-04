import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

from app.main import app
from app.database.database import get_db
from app.models.user_model import User, UserStatus, Role


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


def test_profiles_discover_filters(client: TestClient, db: Session):
    try:
        # Ensure roles exist
        for rn in ["expert"]:
            if db.query(Role).filter(Role.name == rn).first() is None:
                db.add(Role(name=rn))
        db.commit()

        # Create and activate user
        email = "expert_discover@example.com"
        password = "pw"
        u = User(
            email=email,
            password="$2b$12$abcdefghijk",  # not used for login; will update below
            is_verified=True,
            status=UserStatus.active,
            referral_code=uuid.uuid4().hex[:8],
        )
        from app.core.security import get_password_hash
        u.password = get_password_hash(password)
        db.add(u)
        db.commit()
        db.refresh(u)

        headers = auth_headers(client, email, password)

        # Assign expert role
        from app.services.user_service import assign_role_to_user
        assign_role_to_user(db, u, "expert")

        # Ensure profile exists (auto-create via GET for owner)
        g = client.get(f"/api/v1/profiles/{u.id}", headers=headers)
        assert g.status_code == 200, g.text
        # Update profile name
        r = client.put("/api/v1/profiles/me", json={"full_name": "Alice Wonder"}, headers=headers)
        assert r.status_code == 200, r.text

        # Discover by name
        d = client.get("/api/v1/profiles/discover", params={"name": "Alice"})
        assert d.status_code == 200, d.text
        items = d.json()
        assert len(items) >= 1
        assert "average_rating" in items[0]
        assert "reviews_count" in items[0]
    finally:
        db.close()
