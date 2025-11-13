from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.models.user_model import User, UserStatus, Role
from app.schemas.user_schema import UserCreate
from app.services.user_service import create_user

client = TestClient(app)

def test_auto_create_profile(db: Session):
    user_in = UserCreate(email="test3@example.com", password="password")
    user = create_user(db, user_in)

    response = client.get(f"/api/v1/profiles/{user.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == str(user.id)

def test_read_own_profile(db: Session):
    user_in = UserCreate(email="test4@example.com", password="password")
    user = create_user(db, user_in)
    user.status = UserStatus.active
    user.is_verified = True
    db.commit()
    
    response = client.post("/api/v1/auth/login", data={"username": "test4@example.com", "password": "password"})
    assert response.status_code == 200
    token = response.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}
    response = client.get(f"/api/v1/profiles/{user.id}", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == str(user.id)

def test_update_own_profile(db: Session):
    user_in = UserCreate(email="test5@example.com", password="password")
    user = create_user(db, user_in)
    user.status = UserStatus.active
    user.is_verified = True
    db.commit()
    
    response = client.post("/api/v1/auth/login", data={"username": "test5@example.com", "password": "password"})
    assert response.status_code == 200
    token = response.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}
    profile_data = {"full_name": "Test User 5", "bio": "This is a test bio for user 5."}
    response = client.put("/api/v1/profiles/me", json=profile_data, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "Test User 5"
    assert data["bio"] == "This is a test bio for user 5."

def test_update_other_user_profile_fails(db: Session):
    user_in_1 = UserCreate(email="test6@example.com", password="password")
    user1 = create_user(db, user_in_1)
    user1.status = UserStatus.active
    user1.is_verified = True
    db.commit()

    user_in_2 = UserCreate(email="test7@example.com", password="password")
    user2 = create_user(db, user_in_2)
    
    response = client.post("/api/v1/auth/login", data={"username": "test6@example.com", "password": "password"})
    assert response.status_code == 200
    token = response.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}
    profile_data = {"full_name": "New Name"}
    # Attempt to update user2's profile with user1's token
    response = client.put(f"/api/v1/profiles/me", json=profile_data, headers=headers)
    
    # Verify that user2's profile remains unchanged
    db.refresh(user2.profile)
    assert user2.profile.full_name != "New Name"

def test_unauthenticated_update_profile_fails(db: Session):
    profile_data = {"full_name": "New Name"}
    response = client.put("/api/v1/profiles/me", json=profile_data)
    assert response.status_code == 401

def test_complete_onboarding(db: Session):
    student_role = Role(name="student")
    db.add(student_role)
    db.commit()

    user_in = UserCreate(email="onboarding@example.com", password="password")
    user = create_user(db, user_in)
    user.status = UserStatus.active
    user.is_verified = True
    db.commit()

    response = client.post("/api/v1/auth/login", data={"username": "onboarding@example.com", "password": "password"})
    assert response.status_code == 200
    token = response.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}
    onboarding_data = {"full_name": "Onboarding User", "role": "student"}
    response = client.put("/api/v1/profiles/me/onboarding", json=onboarding_data, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "Onboarding User"

    db.refresh(user)
    assert any(role.name == "student" for role in user.roles)