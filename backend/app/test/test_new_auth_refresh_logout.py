from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import uuid

from app.main import app
from app.database.database import get_db
from app.models.user_model import User, UserStatus
from app.core.security import get_password_hash


def setup_db():
    for dep, func in app.dependency_overrides.items():
        if dep is get_db:
            gen = func()
            db = next(gen)
            return db
    raise RuntimeError("get_db override not found")


def test_auth_refresh_logout(client: TestClient, db: Session):
    try:
        user = User(
            email="refresh@example.com",
            password=get_password_hash("pw"),
            is_verified=True,
            status=UserStatus.active,
            referral_code=uuid.uuid4().hex[:8],
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        r = client.post("/api/v1/auth/login", data={"username": user.email, "password": "pw"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert "refresh_token" in body
        rt = body["refresh_token"]

        rr = client.post("/api/v1/auth/refresh", params={"refresh_token": rt})
        assert rr.status_code == 200, rr.text
        assert "access_token" in rr.json()

        headers = {"Authorization": f"Bearer {body['access_token']}"}
        lo = client.post("/api/v1/auth/logout", headers=headers)
        assert lo.status_code == 200, lo.text
    finally:
        db.close()
