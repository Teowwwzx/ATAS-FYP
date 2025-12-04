from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.test.conftest import TestingSessionLocal
from app.database.database import Base
from app.models.user_model import User, UserStatus, Role
from app.core.security import get_password_hash

def setup_db() -> Session:
    Base.metadata.drop_all(bind=TestingSessionLocal.kw['bind'])
    Base.metadata.create_all(bind=TestingSessionLocal.kw['bind'])
    return TestingSessionLocal()

def test_users_me_returns_roles(client: TestClient):
    db = setup_db()
    try:
        # Create role
        student = Role(name="student")
        db.add(student)
        db.commit()
        # Create user
        u = User(email="me@example.com", password=get_password_hash("password"), is_verified=True, status=UserStatus.active, referral_code="abcd1234")
        db.add(u)
        db.commit()
        db.refresh(u)
        # Assign role
        u.roles.append(student)
        db.commit()
        # Login to get token
        response = client.post("/api/v1/auth/login", data={"username": "me@example.com", "password": "password"})
        assert response.status_code == 200
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        r = client.get("/api/v1/users/me", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == "me@example.com"
        assert "student" in data["roles"]
    finally:
        db.close()