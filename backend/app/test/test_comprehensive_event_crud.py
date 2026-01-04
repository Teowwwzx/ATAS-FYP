import uuid
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.database.database import get_db
from app.models.user_model import User, UserStatus
from app.models.event_model import EventParticipantRole
from app.dependencies import get_current_user, get_current_user_optional
import os

def create_user(db: Session, email: str) -> User:
    u = User(email=email, password="x", is_verified=True, status=UserStatus.active, referral_code=uuid.uuid4().hex[:8])
    db.add(u)
    db.commit()
    db.refresh(u)
    return u

def override_current_user(user: User):
    def _dep():
        return user
    return _dep

def override_current_user_optional(user: User):
    def _dep():
        return user
    return _dep

def check_res(res, expected=200):
    if res.status_code != expected:
        msg = f"FAILED {res.request.method} {res.request.url} - Status: {res.status_code} - Resp: {res.text}"
        print(msg)
        with open("test_failure.log", "a") as f:
            f.write(msg + "\n")
    assert res.status_code == expected, res.text
    return res

def test_comprehensive_event_crud(client: TestClient, db: Session):
    # Clear log
    if os.path.exists("test_failure.log"):
        os.remove("test_failure.log")

    # 1. Setup Users
    organizer = create_user(db, f"org_{uuid.uuid4().hex[:6]}@test.com")
    committee = create_user(db, f"com_{uuid.uuid4().hex[:6]}@test.com")
    speaker = create_user(db, f"spk_{uuid.uuid4().hex[:6]}@test.com")
    outsider = create_user(db, f"out_{uuid.uuid4().hex[:6]}@test.com")

    # 2. Organizer Creates Event
    app.dependency_overrides[get_current_user] = override_current_user(organizer)
    
    event_payload = {
        "title": "Comprehensive Test Event",
        "description": "Testing CRUD",
        "format": "seminar",
        "type": "physical",
        "start_datetime": (datetime.utcnow() + timedelta(days=1)).isoformat(),
        "end_datetime": (datetime.utcnow() + timedelta(days=2)).isoformat(),
        "registration_type": "free",
        "visibility": "public"
    }
    
    res_event = client.post("/api/v1/events", json=event_payload)
    check_res(res_event)
    event_id = res_event.json()["id"]

    # 3. Add Participants (Committee & Speaker)
    # Invite Committee
    res_invite_com = client.post(f"/api/v1/events/{event_id}/participants", json={
        "user_id": str(committee.id),
        "role": "committee"
    })
    check_res(res_invite_com)
    
    # Invite Speaker
    res_invite_spk = client.post(f"/api/v1/events/{event_id}/participants", json={
        "user_id": str(speaker.id),
        "role": "speaker"
    })
    check_res(res_invite_spk)

    # Accept Invites (Switch user context)
    # Committee Accepts
    app.dependency_overrides[get_current_user] = override_current_user(committee)
    res_accept_com = client.put(f"/api/v1/events/{event_id}/participants/me/status", json={"status": "accepted"})
    check_res(res_accept_com)

    # Speaker Accepts
    app.dependency_overrides[get_current_user] = override_current_user(speaker)
    res_accept_spk = client.put(f"/api/v1/events/{event_id}/participants/me/status", json={"status": "accepted"})
    check_res(res_accept_spk)

    # 4. Proposal CRUD
    # Speaker Creates Proposal
    app.dependency_overrides[get_current_user] = override_current_user(speaker)
    # Note: create_proposal expects multipart/form-data for file upload usually, or just JSON if implemented that way.
    # The router uses Form(...) for fields and UploadFile for file.
    # So we cannot use json=...
    # Let's check how create_proposal is implemented.
    # Assuming it takes Form data.
    
    # Based on my previous analysis of create_proposal:
    # title: str = Form(...)
    # description: str = Form(None)
    # file_url: str = Form(None)
    # file: UploadFile = File(None)
    
    proposal_data = {
        "title": "My Speech",
        "description": "Talking about things",
        "file_url": "http://example.com/slides.pdf"
    }
    # For Form data in TestClient, use data=...
    res_prop = client.post(f"/api/v1/events/{event_id}/proposals", data=proposal_data)
    check_res(res_prop)
    proposal_id = res_prop.json()["id"]

    # Organizer Comments on Proposal
    app.dependency_overrides[get_current_user] = override_current_user(organizer)
    comment_payload = {"content": "Great topic, please shorten it."}
    res_comment = client.post(f"/api/v1/events/proposals/{proposal_id}/comments", json=comment_payload)
    check_res(res_comment)
    
    # Verify Comment List
    res_comments = client.get(f"/api/v1/events/proposals/{proposal_id}/comments")
    check_res(res_comments)
    assert len(res_comments.json()) == 1
    assert res_comments.json()[0]["content"] == "Great topic, please shorten it."

    # 5. Checklist CRUD & Assignments
    # Organizer Creates Internal Checklist Item
    app.dependency_overrides[get_current_user] = override_current_user(organizer)
    checklist_internal = {
        "title": "Internal Planning",
        "visibility": "internal",
        "due_datetime": (datetime.utcnow() + timedelta(hours=12)).isoformat()
    }
    res_cl_int = client.post(f"/api/v1/events/{event_id}/checklist", json=checklist_internal)
    check_res(res_cl_int)
    cl_int_id = res_cl_int.json()["id"]

    # Organizer Creates External Checklist Item (Assigned to Speaker)
    checklist_external = {
        "title": "Upload Slides",
        "visibility": "external",
        "audience_role": "speaker",
        "assigned_user_ids": [str(speaker.id)],
        "file_ids": [str(proposal_id)] # Linking the proposal
    }
    res_cl_ext = client.post(f"/api/v1/events/{event_id}/checklist", json=checklist_external)
    check_res(res_cl_ext)
    cl_ext_id = res_cl_ext.json()["id"]

    # Verify Linking
    assert len(res_cl_ext.json()["files"]) == 1
    assert res_cl_ext.json()["files"][0]["id"] == str(proposal_id)

    # 6. Verify Visibility / Permissions
    
    # Committee should see Internal Item
    app.dependency_overrides[get_current_user] = override_current_user(committee)
    res_list_com = client.get(f"/api/v1/events/{event_id}/checklist")
    check_res(res_list_com)
    ids_com = [item["id"] for item in res_list_com.json()]
    assert cl_int_id in ids_com
    assert cl_ext_id in ids_com

    # Speaker should see External Item (via /checklist/external endpoint or logic?)
    # Note: Standard /checklist endpoint is protected for Organizer/Committee. 
    # Speakers usually access via /checklist/external or similar if implied.
    # Let's check /events/{event_id}/checklist/external endpoint which I saw earlier.
    app.dependency_overrides[get_current_user] = override_current_user(speaker)
    app.dependency_overrides[get_current_user_optional] = override_current_user_optional(speaker)
    res_list_spk = client.get(f"/api/v1/events/{event_id}/checklist/external")
    check_res(res_list_spk)
    ids_spk = [item["id"] for item in res_list_spk.json()]
    assert cl_ext_id in ids_spk
    assert cl_int_id not in ids_spk # Should NOT see internal item

    # Outsider should NOT see anything (or get 403)
    app.dependency_overrides[get_current_user] = override_current_user(outsider)
    app.dependency_overrides[get_current_user_optional] = override_current_user_optional(outsider)
    res_list_out = client.get(f"/api/v1/events/{event_id}/checklist/external")
    # If outsider is not participant, they might get 403 or empty list depending on public visibility logic
    # The code says: if private event and not participant -> 403. This event is public.
    # But visibility logic: if audience_role is set, filter by it.
    # If item has audience_role='speaker', outsider (no role) shouldn't see it.
    check_res(res_list_out)
    assert len(res_list_out.json()) == 0 # Should see nothing relevant

    # 7. Update Checklist Item (Assign Committee)
    app.dependency_overrides[get_current_user] = override_current_user(organizer)
    update_payload = {
        "assigned_user_ids": [str(committee.id)],
        "is_completed": True
    }
    res_update = client.put(f"/api/v1/events/{event_id}/checklist/{cl_int_id}", json=update_payload)
    check_res(res_update)
    assert res_update.json()["is_completed"] == True
    assert str(committee.id) in res_update.json()["assigned_user_ids"]

    # 8. Delete Checklist Item
    res_del = client.delete(f"/api/v1/events/{event_id}/checklist/{cl_int_id}")
    check_res(res_del)
    
    # Verify Deletion
    res_list_final = client.get(f"/api/v1/events/{event_id}/checklist")
    ids_final = [item["id"] for item in res_list_final.json()]
    assert cl_int_id not in ids_final

    print("Comprehensive CRUD Test Passed!")

    app.dependency_overrides.clear()
