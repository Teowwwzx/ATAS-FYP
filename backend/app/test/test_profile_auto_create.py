from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import uuid

from app.main import app
from app.database.database import get_db
from app.models.user_model import User, UserStatus
from app.core.security import get_password_hash
from app.schemas.user_schema import UserCreate
from app.services.user_service import create_user


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


def test_get_profile_owner_profile_exists_from_registration(client: TestClient):
    db: Session = setup_db()
    try:
        email = "auto_create_profile@example.com"
        password = "pw"
        u = create_user(db, UserCreate(email=email, password=password))
        u.is_verified = True
        u.status = UserStatus.active
        db.commit()
        db.refresh(u)

        headers = auth_headers(client, email, password)

        # Profile exists due to registration
        r = client.get(f"/api/v1/profiles/{u.id}", headers=headers)
        assert r.status_code == 200, r.text
        prof = r.json()
        assert prof["user_id"] == str(u.id)
    finally:
        db.close()
