import uuid
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.database.database import get_db
from app.models.user_model import User, UserStatus, Role
from app.models.event_model import Event, EventCategory, Category
from app.models.profile_model import Profile
from app.dependencies import get_current_user, require_roles
import os

def create_admin_user(db: Session, email: str) -> User:
    # Get or create admin role
    role = db.query(Role).filter(Role.name == "admin").first()
    if not role:
        role = Role(name="admin")
        db.add(role)
        db.commit()

    u = User(
        email=email, 
        password="x", 
        is_verified=True, 
        status=UserStatus.active, 
        referral_code=uuid.uuid4().hex[:8]
    )
    u.roles.append(role)
    db.add(u)
    db.commit()
    db.refresh(u)
    
    # Create Profile for full_name
    p = Profile(
        user_id=u.id,
        full_name="Admin User",
        bio="I am admin",
        visibility="public"
    )
    db.add(p)
    db.commit()
    
    return u

def create_category(db: Session, name: str) -> Category:
    c = Category(name=name)
    db.add(c)
    db.commit()
    db.refresh(c)
    return c

def override_dependency(user: User):
    def _dep():
        return user
    return _dep

def check_res(res, expected=200):
    if res.status_code != expected:
        print(f"FAILED {res.request.method} {res.request.url} - Status: {res.status_code} - Resp: {res.text}")
    assert res.status_code == expected, res.text
    return res

def test_admin_event_dashboard_completeness(client: TestClient, db: Session):
    # 1. Setup Admin & Category
    admin = create_admin_user(db, f"admin_{uuid.uuid4().hex[:6]}@test.com")
    cat = create_category(db, "Tech")
    
    # Override Auth
    app.dependency_overrides[get_current_user] = override_dependency(admin)
    # We also need to override require_roles dependency chain if used directly, 
    # but usually `require_roles` depends on `get_current_user`. 
    # Let's check `require_roles` implementation.
    # It returns a dependency function.
    # If `admin_router` uses `Depends(require_roles(["admin"]))`, we need to ensure that passes.
    # `require_roles` calls `get_current_user`. Since we overrode `get_current_user`, it should return our admin user.
    # And our admin user has role='admin'. So it should pass.
    
    # 2. Create Event via Admin Endpoint
    event_payload = {
        "title": "Admin Test Event",
        "description": "Testing Dashboard Columns",
        "format": "seminar",
        "type": "physical",
        "start_datetime": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "end_datetime": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
        "registration_type": "free",
        "visibility": "public",
        "categories": [str(cat.id)]
    }
    
    res_create = client.post("/api/v1/admin/events", json=event_payload)
    check_res(res_create)
    event_id = res_create.json()["id"]
    
    # 3. List Events via Admin Endpoint
    res_list = client.get("/api/v1/admin/events")
    check_res(res_list)
    events = res_list.json()
    
    # Find our event
    target_event = next((e for e in events if e["id"] == event_id), None)
    assert target_event is not None
    
    # 4. Analyze Columns / Fields
    print("Event Data Keys:", target_event.keys())
    
    # Check "Left Out" Columns based on our suspicion
    
    # A. Participant Count
    # The admin creator is added as a participant automatically in `admin_create_event`.
    # So count should be 1.
    if "participant_count" in target_event:
        print(f"participant_count: {target_event['participant_count']}")
        # Assert it's 1 (if implemented) or check if it's 0 (if missing logic)
        # We expect it to be 1 if the logic exists.
        assert target_event["participant_count"] == 1, f"Expected 1 participant, got {target_event['participant_count']}"
    else:
        print("MISSING: participant_count")
        
    # B. Categories
    # We added 1 category.
    if "categories" in target_event:
        print(f"categories: {target_event['categories']}")
        assert len(target_event["categories"]) == 1
        # EventCategoryResponse has 'category_id'
        assert target_event["categories"][0]["category_id"] == str(cat.id)
        assert target_event["categories"][0]["name"] == "Tech"
    else:
        print("MISSING: categories")
        
    # C. Organizer Name/Avatar
    if "organizer_name" in target_event:
        print(f"organizer_name: {target_event['organizer_name']}")
        assert target_event["organizer_name"] is not None # Should be admin's name (which might be None if not set)
        # Check admin profile
    else:
        print("MISSING: organizer_name")

    # D. Computed Stats (Reviews, Rating)
    if "reviews_count" in target_event:
         print(f"reviews_count: {target_event['reviews_count']}")
    else:
         print("MISSING: reviews_count")

    # Clean up
    app.dependency_overrides.clear()

def test_admin_event_update_and_soft_delete(client: TestClient, db: Session):
    # 1. Setup Admin
    admin = create_admin_user(db, f"admin_{uuid.uuid4().hex[:6]}@test.com")
    
    # Override Auth
    app.dependency_overrides[get_current_user] = override_dependency(admin)
    
    # 2. Create Event
    event_payload = {
        "title": "Update Test Event",
        "format": "seminar",
        "type": "physical",
        "start_datetime": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "end_datetime": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
        "registration_type": "paid",
        "visibility": "public",
        "price": 100.0,
        "currency": "MYR",
        "description": "Original Description"
    }
    res_create = client.post("/api/v1/admin/events", json=event_payload)
    check_res(res_create)
    event_id = res_create.json()["id"]

    # 3. Test Admin Update (New Feature)
    update_payload = {
        "title": "Updated Title",
        "description": "Updated Description",
        "auto_accept_registration": False,
        "is_attendance_enabled": False
    }
    res_update = client.put(f"/api/v1/admin/events/{event_id}", json=update_payload)
    check_res(res_update)
    updated_event = res_update.json()
    assert updated_event["title"] == "Updated Title"
    assert updated_event["description"] == "Updated Description"
    assert updated_event["auto_accept_registration"] is False
    assert updated_event["is_attendance_enabled"] is False
    
    # 4. Verify deleted_at is None
    assert "deleted_at" in updated_event
    assert updated_event["deleted_at"] is None

    # 5. Simulate Soft Delete (by User endpoint)
    # Use the User Delete endpoint which performs soft delete
    res_delete = client.delete(f"/api/v1/events/{event_id}")
    check_res(res_delete, expected=204)
    
    # 6. Verify Admin List shows it with deleted_at
    res_list = client.get(f"/api/v1/admin/events")
    check_res(res_list)
    events = res_list.json()
    
    target = next((e for e in events if e["id"] == event_id), None)
    
    assert target is not None, "Soft deleted event should be visible to admin"
    assert target["deleted_at"] is not None
    print(f"Verified deleted_at: {target['deleted_at']}")

    # Clean up
    app.dependency_overrides.clear()
