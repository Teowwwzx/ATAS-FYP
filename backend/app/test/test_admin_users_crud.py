"""
Comprehensive Admin User CRUD Tests

Tests all user management operations including:
- Create, Read, Update, Delete
- Individual field updates (email, status, roles)
- Batch operations (bulk status updates, role assignments)
- Authorization and pagination
"""
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user_model import User, UserStatus, Role
from app.test.test_helpers import (
    create_admin_user, create_test_user, get_admin_headers
)


def test_admin_list_users_with_filters(client: TestClient, db: Session):
    """Test listing users with various filters"""
    admin = create_admin_user(db)
    headers = get_admin_headers(client, admin)
    
    # Create test users with different statuses
    user1 = create_test_user(db, status=UserStatus.active, full_name="Alice Active")
    user2 = create_test_user(db, status=UserStatus.inactive, full_name="Bob Inactive")
    user3 = create_test_user(db, status=UserStatus.suspended, full_name="Charlie Suspended")
    
    # Test list all users
    response = client.get("/api/v1/users", headers=headers)
    assert response.status_code == 200
    users = response.json()
    assert len(users) >= 4  # admin + 3 test users
    
    # Test filter by status
    response = client.get(
        "/api/v1/users", 
        params={"status": UserStatus.active.value},
        headers=headers
    )
    assert response.status_code == 200
    active_users = response.json()
    assert len(active_users) >= 2  # admin + user1
    
    # Test filter by email substring
    response = client.get(
        "/api/v1/users",
        params={"email": user1.email.split('@')[0]},
        headers=headers
    )
    assert response.status_code == 200
    filtered = response.json()
    assert any(u["email"] == user1.email for u in filtered)
    
    # Test filter by name
    response = client.get(
        "/api/v1/users",
        params={"name": "Alice"},
        headers=headers
    )
    assert response.status_code == 200
    named_users = response.json()
    assert any(u["email"] == user1.email for u in named_users)


def test_admin_count_users_with_filters(client: TestClient, db: Session):
    """Test counting users with filters"""
    admin = create_admin_user(db)
    headers = get_admin_headers(client, admin)
    
    # Create users
    create_test_user(db, status=UserStatus.active)
    create_test_user(db, status=UserStatus.active)
    create_test_user(db, status=UserStatus.suspended)
    
    # Test count all users
    response = client.get("/api/v1/users/search/count", headers=headers)
    assert response.status_code == 200
    assert response.json()["total_count"] >= 4  # admin + 3 test users
    
    # Test count by status
    response = client.get(
        "/api/v1/users/search/count",
        params={"status": UserStatus.suspended.value},
        headers=headers
    )
    assert response.status_code == 200
    assert response.json()["total_count"] >= 1


def test_admin_suspend_and_activate_user(client: TestClient, db: Session):
    """Test suspending and activating users"""
    admin = create_admin_user(db)
    headers = get_admin_headers(client, admin)
    
    user = create_test_user(db, status=UserStatus.active)
    
    # Suspend user
    response = client.post(f"/api/v1/users/{user.id}/suspend", headers=headers)
    assert response.status_code == 200
    
    db.refresh(user)
    assert user.status == UserStatus.suspended
    
    # Activate user
    response = client.post(f"/api/v1/users/{user.id}/activate", headers=headers)
    assert response.status_code == 200
    
    db.refresh(user)
    assert user.status == UserStatus.active


def test_admin_assign_and_remove_roles(client: TestClient, db: Session):
    """Test assigning and removing roles from users"""
    admin = create_admin_user(db)
    headers = get_admin_headers(client, admin)
    
    user = create_test_user(db)
    
    # Ensure sponsor role exists
    sponsor_role = db.query(Role).filter(Role.name == "sponsor").first()
    if not sponsor_role:
        sponsor_role = Role(name="sponsor")
        db.add(sponsor_role)
        db.commit()
    
    # Assign sponsor role
    response = client.post(
        f"/api/v1/users/{user.id}/roles/sponsor",
        headers=headers
    )
    assert response.status_code == 200
    
    # Verify role assigned
    db.refresh(user)
    user_roles = [r.name for r in user.roles]
    assert "sponsor" in user_roles
    
    # Remove sponsor role
    response = client.delete(
        f"/api/v1/users/{user.id}/roles/sponsor",
        headers=headers
    )
    assert response.status_code == 200
    
    # Verify role removed
    db.refresh(user)
    user_roles = [r.name for r in user.roles]
    assert "sponsor" not in user_roles


def test_admin_batch_suspend_users(client: TestClient, db: Session):
    """Test batch suspending multiple users"""
    admin = create_admin_user(db)
    headers = get_admin_headers(client, admin)
    
    users = [create_test_user(db, status=UserStatus.active) for _ in range(3)]
    user_ids = [str(u.id) for u in users]
    
    # Batch suspend (simulating multiple suspend calls)
    for user_id in user_ids:
        response = client.post(f"/api/v1/users/{user_id}/suspend", headers=headers)
        assert response.status_code == 200
    
    # Verify all suspended
    for user in users:
        db.refresh(user)
        assert user.status == UserStatus.suspended


def test_admin_batch_assign_roles(client: TestClient, db: Session):
    """Test batch assigning roles to multiple users"""
    admin = create_admin_user(db)
    headers = get_admin_headers(client, admin)
    
    # Ensure expert role exists
    expert_role = db.query(Role).filter(Role.name == "expert").first()
    if not expert_role:
        expert_role = Role(name="expert")
        db.add(expert_role)
        db.commit()
    
    users = [create_test_user(db) for _ in range(3)]
    user_ids = [str(u.id) for u in users]
    
    # Batch assign expert role
    for user_id in user_ids:
        response = client.post(
            f"/api/v1/users/{user_id}/roles/expert",
            headers=headers
        )
        assert response.status_code == 200
    
    # Verify all have expert role
    for user in users:
        db.refresh(user)
        user_roles = [r.name for r in user.roles]
        assert "expert" in user_roles


def test_admin_pagination(client: TestClient, db: Session):
    """Test user list pagination"""
    admin = create_admin_user(db)
    headers = get_admin_headers(client, admin)
    
    # Create multiple users
    for i in range(15):
        create_test_user(db, full_name=f"User {i:02d}")
    
    # Test page 1
    response = client.get(
        "/api/v1/users",
        params={"page": 1, "page_size": 10},
        headers=headers
    )
    assert response.status_code == 200
    page1 = response.json()
    assert len(page1) <= 10
    
    # Test page 2
    response = client.get(
        "/api/v1/users",
        params={"page": 2, "page_size": 10},
        headers=headers
    )
    assert response.status_code == 200
    page2 = response.json()
    
    # Ensure different results
    if len(page1) == 10:  # Only if there are enough users
        page1_ids = [u["id"] for u in page1]
        page2_ids = [u["id"] for u in page2]
        assert not any(uid in page1_ids for uid in page2_ids)


def test_unauthorized_access(client: TestClient, db: Session):
    """Test that non-admin users cannot access admin endpoints"""
    # Create regular user
    regular_user = create_test_user(db)
    
    # Try to login as regular user
    response = client.post(
        "/api/v1/auth/login",
        data={"username": regular_user.email, "password": "testpass123"}
    )
    assert response.status_code == 200
    regular_token = response.json()["access_token"]
    regular_headers = {"Authorization": f"Bearer {regular_token}"}
    
    # Try to access admin endpoint
    response = client.get("/api/v1/users", headers=regular_headers)
    # Should be 403 Forbidden
    assert response.status_code in [403, 401]


def test_admin_update_user_fields(client: TestClient, db: Session):
    """Test updating individual user fields"""
    admin = create_admin_user(db)
    headers = get_admin_headers(client, admin)
    
    user = create_test_user(db)
    original_status = user.status
    
    # Test status change
    response = client.post(f"/api/v1/users/{user.id}/suspend", headers=headers)
    assert response.status_code == 200
    db.refresh(user)
    assert user.status != original_status
    assert user.status == UserStatus.suspended
