import requests
import datetime
from datetime import timezone
import json
import sys
import os
from dotenv import load_dotenv

# Add backend to path for DB access
sys.path.append(os.path.join(os.getcwd(), 'backend'))
load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))

from app.database.database import SessionLocal
from app.models.user_model import User, UserStatus

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
PASSWORD = "Password123!"

def log(msg, status="INFO"):
    print(f"[{status}] {msg}")

def fail(msg):
    log(msg, "FAIL")
    sys.exit(1)

def verify_user_db(email):
    try:
        db = SessionLocal()
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.is_verified = True
            user.status = UserStatus.active
            db.commit()
            log(f"Manually verified {email} in DB")
        db.close()
    except Exception as e:
        log(f"Failed to verify user in DB: {e}", "WARN")

def register_and_login(email):
    # Register
    log(f"Registering/Logging in {email}...")
    reg_payload = {"email": email, "password": PASSWORD, "full_name": email.split('@')[0]}
    try:
        resp = requests.post(f"{BASE_URL}/auth/register", json=reg_payload)
        if resp.status_code == 200:
            log(f"Registered {email}")
        elif resp.status_code == 400 and "already registered" in resp.text:
            log(f"User {email} already exists")
        else:
            fail(f"Failed to register {email}: {resp.text}")
    except Exception as e:
        fail(f"Connection error: {e}")

    # Manual Verify
    verify_user_db(email)

    # Login
    login_payload = {"username": email, "password": PASSWORD}
    resp = requests.post(f"{BASE_URL}/auth/login", data=login_payload)
    if resp.status_code != 200:
        fail(f"Failed to login {email}: {resp.text}")
    
    data = resp.json()
    token = data["access_token"]
    
    # Get User ID
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"{BASE_URL}/users/me", headers=headers)
    if resp.status_code != 200:
        fail(f"Failed to get user info: {resp.text}")
    user_id = resp.json()["id"]
    
    return token, user_id

def create_event(token, title, start_offset_days, end_offset_days):
    log(f"Creating event '{title}'...")
    now = datetime.datetime.now(timezone.utc)
    start = now + datetime.timedelta(days=start_offset_days)
    end = now + datetime.timedelta(days=end_offset_days)
    
    payload = {
        "title": title,
        "start_datetime": start.isoformat(),
        "end_datetime": end.isoformat(),
        "type": "physical",
        "format": "workshop",
        "category_ids": [],
        "venue_name": "Test Venue",
        "description": "Test Description",
        "visibility": "public",
        "registration_type": "free"
    }
    
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.post(f"{BASE_URL}/events", json=payload, headers=headers)
    if resp.status_code != 200:
        fail(f"Failed to create event: {resp.text}")
    
    event_id = resp.json()["id"]
    log(f"Created event {event_id}")
    return event_id

def invite_user(token, event_id, user_id, role="audience"):
    log(f"Inviting user {user_id} to event {event_id}...")
    payload = {
        "user_id": user_id,
        "role": role,
        "description": "Test Invite"
    }
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.post(f"{BASE_URL}/events/{event_id}/participants", json=payload, headers=headers)
    
    if resp.status_code == 409:
        log("User already invited/joined (409), proceeding...")
        return
        
    if resp.status_code != 200:
        fail(f"Failed to invite user: {resp.text}")
    log("Invitation sent.")

def respond_invitation(token, event_id, status):
    log(f"Responding '{status}' to event {event_id}...")
    payload = {"status": status}
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.put(f"{BASE_URL}/events/{event_id}/participants/me/status", json=payload, headers=headers)
    if resp.status_code != 200:
        fail(f"Failed to respond: {resp.text}")
    log("Response recorded.")

def check_requests(token, req_type, expected_event_id, should_exist=True, expected_status=None):
    log(f"Checking '{req_type}' requests...")
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"{BASE_URL}/events/me/requests", params={"type": req_type}, headers=headers)
    if resp.status_code != 200:
        fail(f"Failed to get requests: {resp.text}")
    
    items = resp.json()
    found = next((item for item in items if item["event"]["id"] == expected_event_id), None)
    
    if should_exist:
        if not found:
            fail(f"Event {expected_event_id} NOT found in {req_type} requests!")
        log(f"Event found in {req_type} list.")
        if expected_status:
            if found["status"] != expected_status:
                fail(f"Expected status {expected_status}, got {found['status']}")
            log(f"Status matches: {expected_status}")
    else:
        if found:
            fail(f"Event {expected_event_id} SHOULD NOT be in {req_type} requests!")
        log(f"Event correctly absent from {req_type} list.")

def check_my_events(token, expected_event_id, expected_list_type):
    # expected_list_type: 'upcoming' or 'past' logic check
    log(f"Checking my events for {expected_event_id}...")
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"{BASE_URL}/events/mine", headers=headers)
    if resp.status_code != 200:
        fail(f"Failed to get my events: {resp.text}")
        
    items = resp.json()
    found = next((item for item in items if item["event_id"] == expected_event_id), None)
    
    if not found:
        fail(f"Event {expected_event_id} NOT found in My Events!")
        
    log(f"Event found in My Events.")
    
    # Client-side filtering logic simulation
    end_dt = datetime.datetime.fromisoformat(found["end_datetime"].replace('Z', '+00:00'))
    now = datetime.datetime.now(timezone.utc)
    
    is_upcoming = end_dt > now
    if expected_list_type == 'upcoming' and not is_upcoming:
        fail("Event should be upcoming but end_date is in past!")
    if expected_list_type == 'past' and is_upcoming:
        fail("Event should be past but end_date is in future!")
        
    log(f"Event correctly categorized as {expected_list_type}.")

def main():
    log("=== STARTING VALIDATION TEST ===")
    
    # 1. Setup Users
    token_org, id_org = register_and_login("test_org_v2@example.com")
    token_a, id_a = register_and_login("test_user_a_v2@example.com") # Pending
    token_b, id_b = register_and_login("test_user_b_v2@example.com") # Rejected
    token_c, id_c = register_and_login("test_user_c_v2@example.com") # Expired
    token_d, id_d = register_and_login("test_user_d_v2@example.com") # Accepted Future
    token_e, id_e = register_and_login("test_user_e_v2@example.com") # Accepted Past
    
    # 2. Create Events
    # Future Event 1 (For A & B)
    future_evt_1 = create_event(token_org, "Future Event A/B", 5, 6)
    # Future Event 2 (For D)
    future_evt_2 = create_event(token_org, "Future Event D", 10, 11)
    # Past Event (For C & E)
    past_evt = create_event(token_org, "Past Event C/E", -5, -1)
    
    log("--- SCENARIO 1: Pending Invitation ---")
    invite_user(token_org, future_evt_1, id_a)
    check_requests(token_a, "pending", future_evt_1, should_exist=True, expected_status="pending")
    check_requests(token_a, "history", future_evt_1, should_exist=False)
    
    log("--- SCENARIO 2: Rejected Invitation ---")
    invite_user(token_org, future_evt_1, id_b)
    respond_invitation(token_b, future_evt_1, "rejected")
    check_requests(token_b, "pending", future_evt_1, should_exist=False)
    check_requests(token_b, "history", future_evt_1, should_exist=True, expected_status="rejected")
    
    log("--- SCENARIO 3: Expired Invitation (Pending but Event Ended) ---")
    invite_user(token_org, past_evt, id_c)
    # User C does nothing. Event is past.
    check_requests(token_c, "pending", past_evt, should_exist=False) # Should not be in pending because expired
    check_requests(token_c, "history", past_evt, should_exist=True, expected_status="pending") # Should be in history as expired pending
    
    log("--- SCENARIO 4: Accepted Future Event ---")
    invite_user(token_org, future_evt_2, id_d)
    respond_invitation(token_d, future_evt_2, "accepted")
    check_my_events(token_d, future_evt_2, "upcoming")
    
    log("--- SCENARIO 5: Accepted Past Event ---")
    invite_user(token_org, past_evt, id_e)
    # Note: Backend might block accepting past events depending on logic, but let's try.
    # Logic in respond_invitation only checks if participant exists.
    # However, attendance logic checks end time. Acceptance usually allowed before end?
    # Wait, if event is ended, can I accept? 
    # Usually standard logic prevents joining past events.
    # Let's see if the system allows it. If not, we skip acceptance and just check invite logic.
    try:
        respond_invitation(token_e, past_evt, "accepted")
        check_my_events(token_e, past_evt, "past")
    except Exception:
        log("Could not accept past event (expected behavior usually). Checking if it stays in history.")
        check_requests(token_e, "history", past_evt, should_exist=True)

    log("--- SCENARIO 6: Unauthorized Invite (Participant tries to invite) ---")
    try:
        # User A is just a participant (pending/audience) in future_evt_1.
        # Even if accepted, audience cannot invite.
        # Let's try to make User A invite User C to future_evt_1
        payload = {"user_id": id_c, "role": "audience", "description": "Hacker Invite"}
        headers = {"Authorization": f"Bearer {token_a}"}
        resp = requests.post(f"{BASE_URL}/events/{future_evt_1}/participants", json=payload, headers=headers)
        if resp.status_code == 403:
            log("Correctly blocked unauthorized invite (403).")
        else:
            fail(f"Should have failed with 403, got {resp.status_code}: {resp.text}")
    except Exception as e:
        fail(f"Error testing unauthorized invite: {e}")

    log("=== TEST COMPLETED SUCCESSFULLY ===")

if __name__ == "__main__":
    main()
