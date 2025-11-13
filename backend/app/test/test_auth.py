from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from unittest.mock import patch
from app.models.user_model import User, UserStatus
from app.database.database import SessionLocal

import uuid


def test_user_registration(client: TestClient):
    unique_email = f"test-{uuid.uuid4().hex}@example.com"
    response = client.post("/api/v1/auth/register", json={
        "email": unique_email,
        "password": "testpassword"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == unique_email
    assert "id" in data

def test_user_login_before_verification(client: TestClient):
    unique_email = f"testlogin-{uuid.uuid4().hex}@example.com"
    # First, register a user
    client.post("/api/v1/auth/register", json={
        "email": unique_email,
        "password": "testpassword"
    })
    # Then, try to log in
    response = client.post("/api/v1/auth/login", data={
        "username": unique_email,
        "password": "testpassword"
    })
    assert response.status_code == 400
    data = response.json()
    assert data["detail"] == "User is not active. Please verify your email."

def test_email_verification_flow(client: TestClient, db: Session):
    unique_email = f"testverify-{uuid.uuid4().hex}@example.com"
    # First, register a user
    client.post("/api/v1/auth/register", json={
        "email": unique_email,
        "password": "testpassword"
    })

    # Get user from DB to get token
    user = db.query(User).filter(User.email == unique_email).first()
    assert user
    assert user.verification_token

    # Verify the email with the token
    response = client.get(f"/api/v1/auth/verify/{user.verification_token}")
    assert response.status_code == 200
    assert response.json() == {"message": "Email verified successfully"}

    # Try to log in with the new password
    response = client.post("/api/v1/auth/login", data={
        "username": unique_email,
        "password": "testpassword"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"