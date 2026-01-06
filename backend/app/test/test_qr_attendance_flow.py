import sys
import os

# Add backend to sys.path to allow imports from app
sys.path.append(os.path.join(os.getcwd(), "backend"))

from dotenv import load_dotenv
# Load environment variables BEFORE app imports
load_dotenv(os.path.join(os.getcwd(), "backend", ".env"))

import requests
import uuid
import time
from datetime import datetime, timedelta, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.user_model import User, UserStatus
from app.models.event_model import Event, EventParticipant, EventParticipantRole, EventParticipantStatus
from app.models.notification_model import Notification

BASE = "http://localhost:8000/api/v1"
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL not set in .env")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def get_unique_email():
    return f"test_qr_{uuid.uuid4()}@example.com"

def register_and_login(email, password, name):
    # Register
    resp = requests.post(f"{BASE}/auth/register", json={
        "email": email,
        "password": password,
        "full_name": name
    })
    print(f"Register {email}: {resp.status_code} {resp.text}")
    
    # Activate user in DB
    db = SessionLocal()
    try:
        u = db.query(User).filter(User.email == email).first()
        if u:
            u.is_verified = True
            u.status = UserStatus.active
            db.commit()
            print(f"User {email} activated manually.")
        else:
            print(f"User {email} NOT FOUND in DB for activation.")
    finally:
        db.close()
        
    # Login
    resp = requests.post(f"{BASE}/auth/login", data={
        "username": email,
        "password": password
    })
    if resp.status_code != 200:
        print(f"Login failed: {resp.status_code} {resp.text}")
        raise Exception(f"Login failed for {email}")
    return resp.json()["access_token"]

def test_qr_attendance_flow():
    print("=== Starting QR Attendance Flow Test ===")
    
    # 1. Setup Users
    organizer_email = get_unique_email()
    participant_email = get_unique_email()
    committee_email = get_unique_email()
    bystander_email = get_unique_email()
    password = "password123"
    
    print("Creating users...")
    org_token = register_and_login(organizer_email, password, "Organizer User")
    part_token = register_and_login(participant_email, password, "Participant User")
    comm_token = register_and_login(committee_email, password, "Committee User")
    bye_token = register_and_login(bystander_email, password, "Bystander User")
    
    org_headers = {"Authorization": f"Bearer {org_token}"}
    part_headers = {"Authorization": f"Bearer {part_token}"}
    comm_headers = {"Authorization": f"Bearer {comm_token}"}
    bye_headers = {"Authorization": f"Bearer {bye_token}"}
    
    # 2. Create Event
    print("Creating event...")
    event_data = {
        "title": f"QR Test Event {uuid.uuid4()}",
        "description": "Testing QR attendance",
        "start_datetime": (datetime.now(timezone.utc) + timedelta(minutes=1)).isoformat(),
        "end_datetime": (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat(),
        "type": "physical",
        "format": "workshop",
        "registration_type": "free",
        "visibility": "public"
    }
    resp = requests.post(f"{BASE}/events", json=event_data, headers=org_headers)
    assert resp.status_code == 200, f"Event creation failed: {resp.text}"
    event_id = resp.json()["id"]
    print(f"Event created: {event_id}")
    
    # Publish event and open registration
    print("Publishing event and opening registration...")
    resp = requests.put(f"{BASE}/events/{event_id}/publish", headers=org_headers)
    assert resp.status_code == 200, f"Publish failed: {resp.text}"
    resp = requests.put(f"{BASE}/events/{event_id}/registration/open", headers=org_headers)
    assert resp.status_code == 200, f"Open registration failed: {resp.text}"
    
    # 3. Register Participant
    print("Registering participant...")
    resp = requests.post(f"{BASE}/events/{event_id}/join", headers=part_headers)
    assert resp.status_code == 200, f"Registration failed: {resp.text}"
    
    # 4. Register Committee and Assign Role
    print("Setting up committee member...")
    resp = requests.post(f"{BASE}/events/{event_id}/join", headers=comm_headers)
    assert resp.status_code == 200
    
    # Organizer updates committee role
    # Need to find committee user ID
    db = SessionLocal()
    try:
        comm_user = db.query(User).filter(User.email == committee_email).first()
        part_user = db.query(User).filter(User.email == participant_email).first()
        comm_uid = comm_user.id
        part_uid = part_user.id
        
        # Manually verify participant and committee if needed (assuming auto-accept or manual)
        # Check event registration type. Default might be auto-accept?
        # Let's just update status to 'accepted' and role to 'committee' directly in DB to save API calls/complexity
        # But better to use API if possible. Let's use DB for speed and reliability in setup.
        
        ep_comm = db.query(EventParticipant).filter(EventParticipant.event_id == event_id, EventParticipant.user_id == comm_uid).first()
        ep_comm.role = EventParticipantRole.committee
        ep_comm.status = EventParticipantStatus.accepted
        
        ep_part = db.query(EventParticipant).filter(EventParticipant.event_id == event_id, EventParticipant.user_id == part_uid).first()
        ep_part.status = EventParticipantStatus.accepted
        
        db.commit()
    finally:
        db.close()
        
    # 5. Generate QR Token (as Participant)
    print("Generating QR token...")
    resp = requests.post(f"{BASE}/events/{event_id}/attendance/user_qr", headers=part_headers)
    assert resp.status_code == 200, f"Token generation failed: {resp.text}"
    qr_token = resp.json()["token"]
    print("QR Token generated.")
    
    # 6. Test: Organizer Scans Participant (Success)
    print("Test: Organizer scans Participant...")
    scan_payload = {"token": qr_token}
    resp = requests.post(f"{BASE}/events/{event_id}/attendance/scan_user", json=scan_payload, headers=org_headers)
    assert resp.status_code == 200, f"Organizer scan failed: {resp.text}"
    assert resp.json()["status"] == "attended"
    print("Organizer scan successful.")
    
    # Verify Notification
    db = SessionLocal()
    try:
        notif = db.query(Notification).filter(
            Notification.recipient_id == part_uid,
            Notification.content.like(f"%Attendance recorded%")
        ).order_by(Notification.created_at.desc()).first()
        assert notif is not None, "Notification not found for participant"
        print("Notification verified.")
        
        # Reset status for next test
        ep_part = db.query(EventParticipant).filter(EventParticipant.event_id == event_id, EventParticipant.user_id == part_uid).first()
        ep_part.status = EventParticipantStatus.accepted
        db.commit()
    finally:
        db.close()
        
    # 7. Test: Committee Scans Participant (Success)
    print("Test: Committee scans Participant...")
    resp = requests.post(f"{BASE}/events/{event_id}/attendance/scan_user", json=scan_payload, headers=comm_headers)
    assert resp.status_code == 200, f"Committee scan failed: {resp.text}"
    assert resp.json()["status"] == "attended"
    print("Committee scan successful.")
    
    # Reset status
    db = SessionLocal()
    try:
        ep_part = db.query(EventParticipant).filter(EventParticipant.event_id == event_id, EventParticipant.user_id == part_uid).first()
        ep_part.status = EventParticipantStatus.accepted
        db.commit()
    finally:
        db.close()

    # 8. Test: Bystander Scans Participant (Fail - 403)
    print("Test: Bystander scans Participant...")
    resp = requests.post(f"{BASE}/events/{event_id}/attendance/scan_user", json=scan_payload, headers=bye_headers)
    assert resp.status_code == 403, f"Bystander should be forbidden but got {resp.status_code}"
    print("Bystander scan correctly forbidden.")
    
    # 9. Test: Participant Scans Self (Fail - 403)
    # Participant is not committee/organizer
    print("Test: Participant scans self...")
    resp = requests.post(f"{BASE}/events/{event_id}/attendance/scan_user", json=scan_payload, headers=part_headers)
    assert resp.status_code == 403, f"Participant self-scan should be forbidden but got {resp.status_code}"
    print("Participant self-scan correctly forbidden.")
    
    print("\n=== All QR Attendance Tests Passed ===")

if __name__ == "__main__":
    test_qr_attendance_flow()
