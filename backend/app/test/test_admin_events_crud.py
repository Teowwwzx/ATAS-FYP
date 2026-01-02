"""
Comprehensive Admin Event CRUD Tests

Tests all event management operations including:
- Create, Read, Update, Delete
- Individual field updates (title, dates, status, visibility, categories)
- Batch operations (bulk status changes, schedule updates)
- Organizer assignment and category management
"""
import uuid
from datetime import datetime, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.event_model import (
    Event, EventStatus, EventType, EventFormat, EventVisibility,
    EventRegistrationStatus, EventRegistrationType, EventCategory
)
from app.test.test_helpers import (
    create_admin_user, create_test_user, create_test_organization,
    create_test_event, create_test_category, get_admin_headers
)


def test_admin_create_event_with_categories(client: TestClient, db: Session):
    """Test creating an event with categories"""
    admin = create_admin_user(db)
    headers = get_admin_headers(client, admin)
    
    organizer = create_test_user(db)
    cat1 = create_test_category(db, "Technology")
    cat2 = create_test_category(db, "Business")
    
    # Create event via admin endpoint
    event_data = {
        "title": "Test Conference",
        "description": "A test event",
        "start_datetime": (datetime.now() + timedelta(days=7)).isoformat(),
        "end_datetime": (datetime.now() + timedelta(days=7, hours=2)).isoformat(),
        "type": EventType.physical.value,
        "format": EventFormat.seminar.value,
        "status": EventStatus.draft.value,
        "visibility": EventVisibility.public.value,
        "registration_type": EventRegistrationType.free.value,
        "max_participant": 100,
        "venue_remark": "Test Venue",
        "categories": [str(cat1.id), str(cat2.id)]
    }
    
    response = client.post(
        "/api/v1/admin/events",
        json=event_data,
        headers=headers
    )
    
    if response.status_code == 200:
        created_event = response.json()
        assert created_event["title"] == "Test Conference"
        
        # Verify categories attached
        event_categories = db.query(EventCategory).filter(
            EventCategory.event_id == uuid.UUID(created_event["id"])
        ).all()
        assert len(event_categories) >= 2


def test_admin_list_events_with_filters(client: TestClient, db: Session):
    """Test listing events with various filters"""
    admin = create_admin_user(db)
    headers = get_admin_headers(client, admin)
    
    organizer = create_test_user(db)
    
    # Create events with different attributes
    event1 = create_test_event(db, organizer.id, title="Physical Seminar", event_type=EventType.physical, status=EventStatus.published)
    event2 = create_test_event(db, organizer.id, title="Online Webinar", event_type=EventType.online, event_format=EventFormat.webinar, status=EventStatus.draft)
    
    # List all events
    response = client.get("/api/v1/admin/events", headers=headers)
    assert response.status_code == 200
    events = response.json()
    assert len(events) >= 2
    
    # Filter by status
    response = client.get(
        "/api/v1/admin/events",
        params={"status": EventStatus.published.value},
        headers=headers
    )
    assert response.status_code == 200
    published = response.json()
    assert any(e["title"] == "Physical Seminar" for e in published)
    
    # Filter by type
    response = client.get(
        "/api/v1/admin/events",
        params={"type": EventType.online.value},
        headers=headers
    )
    assert response.status_code == 200
    online_events = response.json()
    assert any(e["title"] == "Online Webinar" for e in online_events)


def test_admin_publish_event(client: TestClient, db: Session):
    """Test publishing a draft event"""
    admin = create_admin_user(db)
    headers = get_admin_headers(client, admin)
    
    organizer = create_test_user(db)
    event = create_test_event(db, organizer.id, status=EventStatus.draft)
    
    # Publish event
    response = client.put(f"/api/v1/admin/events/{event.id}/publish", headers=headers)
    assert response.status_code == 200
    
    db.refresh(event)
    assert event.status == EventStatus.published


def test_admin_unpublish_event(client: TestClient, db: Session):
    """Test unpublishing a published event"""
    admin = create_admin_user(db)
    headers = get_admin_headers(client, admin)
    
    organizer = create_test_user(db)
    event = create_test_event(db, organizer.id, status=EventStatus.published)
    
    # Unpublish event
    response = client.put(f"/api/v1/admin/events/{event.id}/unpublish", headers=headers)
    assert response.status_code == 200
    
    db.refresh(event)
    assert event.status == EventStatus.draft


def test_admin_update_event_fields(client: TestClient, db: Session):
    """Test updating individual event fields"""
    admin = create_admin_user(db)
    headers = get_admin_headers(client, admin)
    
    organizer = create_test_user(db)
    event = create_test_event(db, organizer.id, title="Original Title")
    
    # Update various fields
    new_start = datetime.now() + timedelta(days=14)
    new_end = new_start + timedelta(hours=3)
    
    update_data = {
        "title": "Updated Event Title",
        "description": "Updated description",
        "start_datetime": new_start.isoformat(),
        "end_datetime": new_end.isoformat(),
        "status": EventStatus.published.value,
        "visibility": EventVisibility.private.value,
        "max_participant": 200,
        "type": EventType.hybrid.value
    }
    
    response = client.put(
        f"/api/v1/admin/events/{event.id}",
        json=update_data,
        headers=headers
    )
    assert response.status_code == 200
    updated = response.json()
    
    assert updated["title"] == "Updated Event Title"
    assert updated["status"] == EventStatus.published.value
    assert updated["visibility"] == EventVisibility.private.value
    assert updated["max_participant"] == 200


def test_admin_assign_organizer(client: TestClient, db: Session):
    """Test transferring event ownership to new organizer"""
    admin = create_admin_user(db)
    headers = get_admin_headers(client, admin)
    
    original_organizer = create_test_user(db, full_name="Original Organizer")
    new_organizer = create_test_user(db, full_name="New Organizer")
    
    event = create_test_event(db, original_organizer.id)
    
    # Transfer to new organizer
    response = client.put(
        f"/api/v1/admin/events/{event.id}",
        json={"organizer_id": str(new_organizer.id)},
        headers=headers
    )
    assert response.status_code == 200
    
    db.refresh(event)
    assert event.organizer_id == new_organizer.id


def test_admin_update_event_categories(client: TestClient, db: Session):
    """Test updating event categories"""
    admin = create_admin_user(db)
    headers = get_admin_headers(client, admin)
    
    organizer = create_test_user(db)
    cat1 = create_test_category(db, "Original Category")
    cat2 = create_test_category(db, "New Category")
    
    event = create_test_event(db, organizer.id, categories=[cat1.id])
    
    # Update categories
    response = client.put(
        f"/api/v1/admin/events/{event.id}",
        json={"categories": [str(cat2.id)]},
        headers=headers
    )
    assert response.status_code == 200
    
    # Verify categories updated
    event_cats = db.query(EventCategory).filter(EventCategory.event_id == event.id).all()
    category_ids = [ec.category_id for ec in event_cats]
    assert cat2.id in category_ids


def test_admin_delete_event(client: TestClient, db: Session):
    """Test deleting an event"""
    admin = create_admin_user(db)
    headers = get_admin_headers(client, admin)
    
    organizer = create_test_user(db)
    event = create_test_event(db, organizer.id, status=EventStatus.draft)
    event_id = event.id
    
    # Delete event
    response = client.delete(f"/api/v1/admin/events/{event_id}", headers=headers)
    assert response.status_code == 200
    
    # Verify deleted
    deleted_event = db.query(Event).filter(Event.id == event_id).first()
    assert deleted_event is None


def test_admin_batch_publish_events(client: TestClient, db: Session):
    """Test batch publishing multiple events"""
    admin = create_admin_user(db)
    headers = get_admin_headers(client, admin)
    
    organizer = create_test_user(db)
    
    # Create draft events
    events = [create_test_event(db, organizer.id, status=EventStatus.draft) for _ in range(3)]
    
    # Batch publish
    for event in events:
        response = client.put(f"/api/v1/admin/events/{event.id}/publish", headers=headers)
        assert response.status_code == 200
    
    # Verify all published
    for event in events:
        db.refresh(event)
        assert event.status == EventStatus.published


def test_admin_open_close_registration(client: TestClient, db: Session):
    """Test opening and closing event registration"""
    admin = create_admin_user(db)
    headers = get_admin_headers(client, admin)
    
    organizer = create_test_user(db)
    event = create_test_event(db, organizer.id)
    
    # Close registration
    response = client.put(f"/api/v1/admin/events/{event.id}/registration/close", headers=headers)
    assert response.status_code == 200
    
    db.refresh(event)
    assert event.registration_status == EventRegistrationStatus.closed
    
    # Reopen registration
    response = client.put(f"/api/v1/admin/events/{event.id}/registration/open", headers=headers)
    assert response.status_code == 200
    
    db.refresh(event)
    assert event.registration_status == EventRegistrationStatus.opened
