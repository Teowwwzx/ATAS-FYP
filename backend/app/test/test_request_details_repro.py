
import pytest
import uuid
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.database.database import get_db, SessionLocal
from app.models.user_model import User, UserStatus
from app.models.event_model import Event, EventStatus, EventVisibility, EventFormat, EventParticipant, EventParticipantRole, EventParticipantStatus, EventType, EventRegistrationType, EventRegistrationStatus
from app.core.security import get_password_hash, create_access_token

client = TestClient(app)

def get_auth_headers(user_id: str):
    return {"Authorization": f"Bearer {create_access_token(data={'sub': str(user_id)})}"}

@pytest.fixture(scope="module")
def db():
    db = SessionLocal()
    yield db
    db.close()

def test_get_request_details_flow(db):
    # 1. Create Organizer
    organizer_email = f"org_{uuid.uuid4().hex[:6]}@example.com"
    organizer = User(
        email=organizer_email,
        password=get_password_hash("password"),
        is_verified=True,
        status=UserStatus.active,
        referral_code=uuid.uuid4().hex[:8]
    )
    db.add(organizer)
    db.commit()
    db.refresh(organizer)

    # 2. Create Invitee
    invitee_email = f"inv_{uuid.uuid4().hex[:6]}@example.com"
    invitee = User(
        email=invitee_email,
        password=get_password_hash("password"),
        is_verified=True,
        status=UserStatus.active,
        referral_code=uuid.uuid4().hex[:8]
    )
    db.add(invitee)
    db.commit()
    db.refresh(invitee)

    # 3. Create Event
    event = Event(
        organizer_id=organizer.id,
        title="Test Event",
        start_datetime=datetime.now(timezone.utc) + timedelta(days=1),
        end_datetime=datetime.now(timezone.utc) + timedelta(days=1, hours=2),
        status=EventStatus.published,
        visibility=EventVisibility.public,
        format=EventFormat.workshop,
        type=EventType.online,
        registration_type=EventRegistrationType.free,
        registration_status=EventRegistrationStatus.opened,
        auto_accept_registration=False,
        is_attendance_enabled=True
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    # 4. Create Invitation (EventParticipant)
    participant = EventParticipant(
        event_id=event.id,
        user_id=invitee.id,
        role=EventParticipantRole.speaker,
        status=EventParticipantStatus.pending,
        join_method="invited",
        description="Please speak at my event"
    )
    db.add(participant)
    db.commit()
    db.refresh(participant)

    print(f"Created Participant ID: {participant.id}")

    # 5. Test Access as Invitee
    headers = get_auth_headers(invitee.id)
    response = client.get(f"/api/v1/events/requests/{participant.id}", headers=headers)
    
    print(f"Invitee Request Status: {response.status_code}")
    if response.status_code != 200:
        print(f"Response Body: {response.text}")
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(participant.id)
    assert data["event"]["id"] == str(event.id)

    # 6. Test Access as Random User (Should be 403 or 404)
    random_email = f"rand_{uuid.uuid4().hex[:6]}@example.com"
    random_user = User(
        email=random_email,
        password=get_password_hash("password"),
        is_verified=True,
        status=UserStatus.active,
        referral_code=uuid.uuid4().hex[:8]
    )
    db.add(random_user)
    db.commit()
    random_headers = get_auth_headers(random_user.id)
    
    response = client.get(f"/api/v1/events/requests/{participant.id}", headers=random_headers)
    print(f"Random User Request Status: {response.status_code}")
    assert response.status_code == 403 # Based on code analysis

    # 7. Test Non-existent ID (Should be 404)
    fake_id = uuid.uuid4()
    response = client.get(f"/api/v1/events/requests/{fake_id}", headers=headers)
    print(f"Fake ID Request Status: {response.status_code}")
    assert response.status_code == 404

    # 8. Test Access for Soft-Deleted Event
    print("\n--- Testing Soft-Deleted Event ---")
    event.deleted_at = datetime.now(timezone.utc)
    db.add(event)
    db.commit()
    db.refresh(event)
    
    response = client.get(f"/api/v1/events/requests/{participant.id}", headers=headers)
    print(f"Soft-Deleted Event Request Status: {response.status_code}")
    assert response.status_code == 200

    print("\n--- Testing Full Flow (Get My Requests -> Get Request Details) ---")
    # Restore event for flow test or create new one?
    # Let's create a NEW event and participant for this flow to be clean
    
    # 1. Create another event
    event2 = Event(
        organizer_id=organizer.id,
        title="Flow Test Event",
        description="Testing flow",
        format=EventFormat.webinar,
        type=EventType.online,
        start_datetime=datetime.now(timezone.utc) + timedelta(days=1),
        end_datetime=datetime.now(timezone.utc) + timedelta(days=2),
        registration_type=EventRegistrationType.free,
        status=EventStatus.published,
        visibility=EventVisibility.public
    )
    db.add(event2)
    db.commit()
    db.refresh(event2)

    # 2. Invite the user
    participant2 = EventParticipant(
        event_id=event2.id,
        user_id=invitee.id,
        role=EventParticipantRole.speaker,
        status=EventParticipantStatus.pending,
        join_method="invited"
    )
    db.add(participant2)
    db.commit()
    db.refresh(participant2)
    
    # 3. Call get_my_requests
    response = client.get("/api/v1/events/me/requests?type=pending", headers=headers)
    print(f"Get My Requests Status: {response.status_code}")
    assert response.status_code == 200
    requests = response.json()
    print(f"Number of requests: {len(requests)}")
    
    target_request = next((r for r in requests if r["id"] == str(participant2.id)), None)
    assert target_request is not None, "Newly created request not found in get_my_requests"
    
    request_id = target_request["id"]
    print(f"Found Request ID: {request_id}")
    
    # 4. Call get_request_details with that ID
    response = client.get(f"/api/v1/events/requests/{request_id}", headers=headers)
    print(f"Get Request Details Status: {response.status_code}")
    assert response.status_code == 200
    details = response.json()
    assert details["id"] == request_id


