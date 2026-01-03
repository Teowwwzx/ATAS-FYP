import sys
import os
import uuid
# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database.database import Base, get_db
from app.models.user_model import User, UserStatus
from app.models.profile_model import Profile
from app.models.event_model import Event, EventParticipantRole, EventParticipant, EventProposal
from app.core.config import settings
from app.core.security import get_password_hash

# WARNING: This script uses the configured DATABASE_URL.
# It creates test data but does not automatically clean it up to preserve DB integrity if run against prod.

def get_auth_headers(client, email, password):
    res = client.post("/api/v1/auth/login", data={"username": email, "password": password})
    if res.status_code != 200:
        raise Exception(f"Login failed for {email}: {res.text}")
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def run_verification():
    print("Initializing Test Client...")
    client = TestClient(app)
    
    # We need a db session to create setup data directly
    # Workaround for dependency override if any
    db = next(get_db())

    print("Creating Test Data...")
    # 1. Create Organizer
    org_email = f"checklist_org_{uuid.uuid4().hex[:6]}@test.com"
    org_pass = "testpass123"
    
    org_user = User(
        email=org_email, 
        password=get_password_hash(org_pass),
        is_verified=True,
        status=UserStatus.active, 
        referral_code=uuid.uuid4().hex[:8]
    )
    db.add(org_user)
    # Check if profile needed (User model has profile relationship)
    # usually profile is created via signal or manually
    # db.add(Profile(user_id=org_user.id, full_name="Test Org"))
    db.commit()
    db.refresh(org_user)
    # Add Profile manually if needed by your app logic (e.g. for avatar_url)
    db.add(Profile(user_id=org_user.id, full_name="Test Org"))
    db.commit()
    
    print(f"Created Organizer: {org_email}")

    # 2. Create Event
    event = Event(
        organizer_id=org_user.id,
        title="Checklist Verify Event",
        format="seminar",
        type="physical",
        start_datetime="2025-01-01T10:00:00+00:00",
        end_datetime="2025-01-01T12:00:00+00:00",
        registration_type="free",
        status="published",
        visibility="public"
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    print(f"Created Event: {event.id}")

    # Add organizer participant logic if app requires it?
    # Usually organizer has implied access, but some logic checks EventParticipant.
    db.add(EventParticipant(
        event_id=event.id, 
        user_id=org_user.id, 
        role=EventParticipantRole.organizer, 
        status="accepted"
    ))
    db.commit()

    # 3. Create Proposal (File)
    proposal = EventProposal(
        event_id=event.id,
        created_by_user_id=org_user.id,
        title="Test File.pdf",
        description="Test file description",
        file_url="http://test.com/file.pdf"
    )
    db.add(proposal)
    db.commit()
    db.refresh(proposal)
    print(f"Created Proposal/File: {proposal.id}")

    # Login
    headers = get_auth_headers(client, org_email, org_pass)

    # 4. Create Checklist Item with File
    print("Testing Checklist Item Creation with File...")
    res = client.post(
        f"/api/v1/events/{event.id}/checklist",
        json={
            "title": "Verify Task",
            "visibility": "external",
            "file_ids": [str(proposal.id)]
        },
        headers=headers
    )
    if res.status_code != 200:
        print(f"FAILED to create checklist items: {res.text}")
        return
    
    item = res.json()
    print(f"Created Item: {item['id']}")
    
    if len(item.get('files', [])) == 1 and item['files'][0]['id'] == str(proposal.id):
        print("PASS: Item created with persistence file link.")
    else:
        print(f"FAIL: Item files mismatch. Got {item.get('files')}")

    # 5. Verify Updating (Remove File)
    print("Testing Remove File...")
    res_upd = client.put(
        f"/api/v1/events/{event.id}/checklist/{item['id']}",
        json={"file_ids": []},
        headers=headers
    )
    if len(res_upd.json().get('files', [])) == 0:
        print("PASS: File removed successfully.")
    else:
        print("FAIL: File not removed.")

    # 6. Verify Visibility Logic
    print("Testing Visibility Logic...")
    # Create Audience User
    aud_email = f"checklist_aud_{uuid.uuid4().hex[:6]}@test.com"
    aud_user = User(email=aud_email, password=get_password_hash("pass"), is_verified=True, status=UserStatus.active, referral_code=uuid.uuid4().hex[:8])
    db.add(aud_user)
    db.add(Profile(user_id=aud_user.id, full_name="Test Aud"))
    db.commit() # commit user first
    
    # Join Event as Audience
    db.add(EventParticipant(event_id=event.id, user_id=aud_user.id, role=EventParticipantRole.audience, status="accepted"))
    db.commit()

    # Create Speaker-only Task
    client.post(
        f"/api/v1/events/{event.id}/checklist",
        json={"title": "Speaker Task", "visibility": "external", "audience_role": "speaker"},
        headers=headers
    )
    
    # Login as Audience
    aud_headers = get_auth_headers(client, aud_email, "pass")
    
    # Fetch List
    res_list = client.get(f"/api/v1/events/{event.id}/checklist/external", headers=aud_headers)
    items = res_list.json()
    titles = [i['title'] for i in items]
    
    if "Verify Task" in titles and "Speaker Task" not in titles:
        print("PASS: Audience sees generic task but NOT speaker task.")
    else:
        print(f"FAIL: Visibility logic wrong. Saw: {titles}")

    print("Verification Completed.")

if __name__ == "__main__":
    try:
        run_verification()
    except Exception as e:
        print(f"An error occurred: {e}")
        import traceback
        traceback.print_exc()
