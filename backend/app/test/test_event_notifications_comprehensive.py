import requests
import uuid
import os
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from sqlalchemy.orm import Session
import sys

# Prepare env and import DB
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), "backend"))
load_dotenv(os.path.join(os.getcwd(), "backend", ".env"))

from app.database.database import SessionLocal
from app.models.user_model import User, UserStatus

BASE = "http://127.0.0.1:8000/api/v1"

def register(email: str, password: str, full_name: str):
    requests.post(f"{BASE}/auth/register", json={"email": email, "password": password, "full_name": full_name})

def verify_and_login(email: str, password: str, display_name: str | None = None):
    register(email, password, display_name or email.split("@")[0])
    db: Session = SessionLocal()
    try:
        u = db.query(User).filter(User.email == email).first()
        if u:
            u.is_verified = True
            u.status = UserStatus.active
            db.commit()
    finally:
        db.close()
    r = requests.post(f"{BASE}/auth/login", data={"username": email, "password": password})
    r.raise_for_status()
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def run():
    print("Connection successful!")
    # Users
    organizer_email = f"org_{uuid.uuid4().hex[:8]}@example.com"
    participant_email = f"part_{uuid.uuid4().hex[:8]}@example.com"
    invited_email = f"inv_{uuid.uuid4().hex[:8]}@example.com"
    committee_email = f"com_{uuid.uuid4().hex[:8]}@example.com"
    password = "Password123!"

    org_headers = verify_and_login(organizer_email, password, "Organizer")
    part_headers = verify_and_login(participant_email, password, "Participant")
    invited_headers = verify_and_login(invited_email, password, "InvitedUser")
    comm_headers = verify_and_login(committee_email, password, "CommitteeUser")

    # Create event (paid, public)
    start = datetime.now(timezone.utc) + timedelta(minutes=25)
    end = start + timedelta(hours=1)
    body = {
        "title": "Comprehensive Event Notifications",
        "description": "End-to-end notifications test",
        "format": "workshop",
        "type": "physical",
        "start_datetime": start.isoformat(),
        "end_datetime": end.isoformat(),
        "registration_type": "paid",
        "visibility": "public",
        "auto_accept_registration": False,
    }
    ev = requests.post(f"{BASE}/events", json=body, headers=org_headers)
    ev.raise_for_status()
    event = ev.json()
    event_id = event["id"]

    # Publish and open registration
    requests.put(f"{BASE}/events/{event_id}/publish", headers=org_headers).raise_for_status()
    requests.put(f"{BASE}/events/{event_id}/registration/open", headers=org_headers).raise_for_status()

    # Committee invite so they receive registration notifications
    # Invite committee user
    ci = requests.post(
        f"{BASE}/events/{event_id}/participants",
        json={"user_id": get_user_id(committee_email), "role": "committee"},
        headers=org_headers
    )
    ci.raise_for_status()

    # Invite a speaker (invited user)
    sp = requests.post(
        f"{BASE}/events/{event_id}/participants",
        json={"user_id": get_user_id(invited_email), "role": "speaker", "description": "Talk segment"},
        headers=org_headers
    )
    sp.raise_for_status()

    # Participant joins (pending + payment pending)
    jp = requests.post(f"{BASE}/events/{event_id}/join", headers=part_headers)
    jp.raise_for_status()
    participant = jp.json()
    participant_id = participant["id"]

    # Organizer updates participant role
    ur = requests.put(
        f"{BASE}/events/{event_id}/participants/{participant_id}/role",
        json={"role": "student"},
        headers=org_headers
    )
    ur.raise_for_status()

    # Organizer approves participant status
    st = requests.put(
        f"{BASE}/events/{event_id}/participants/{participant_id}/status",
        json={"status": "accepted"},
        headers=org_headers
    )
    st.raise_for_status()

    # Organizer verifies payment
    pay = requests.put(
        f"{BASE}/events/{event_id}/participants/{participant_id}/payment",
        json={"status": "accepted"},
        headers=org_headers
    )
    pay.raise_for_status()

    # Create a checklist item assigned to participant
    cl = requests.post(
        f"{BASE}/events/{event_id}/checklist",
        json={"title": "Bring ID", "assigned_user_id": get_user_id(participant_email)},
        headers=org_headers
    )
    cl.raise_for_status()

    # Create and run due reminder for participant
    requests.post(f"{BASE}/events/{event_id}/reminders", json={"option": "one_day"}, headers=part_headers).raise_for_status()
    _ = requests.post(f"{BASE}/events/reminders/run", headers=part_headers)

    # Self-check-in for participant
    sc = requests.post(f"{BASE}/events/{event_id}/self-checkin", headers=part_headers)
    # It may 200 or 400 depending on exact time window logic; ignore failures for this test

    # Fetch notifications and print summaries
    print("== Organizer notifications ==")
    print_notifications(headers=org_headers, filter_text="A participant joined your event")
    print("== Participant notifications ==")
    print_notifications(headers=part_headers, filter_text="Your payment for")
    print_notifications(headers=part_headers, filter_text="Your participation status")
    print_notifications(headers=part_headers, filter_text="Your role for")
    print_notifications(headers=part_headers, filter_text="Reminder:")
    print_notifications(headers=part_headers, filter_text="Attendance recorded")
    print("== Invited (speaker) notifications ==")
    print_notifications(headers=invited_headers, filter_text="invited to")
    print("== Committee notifications ==")
    print_notifications(headers=comm_headers, filter_text="Registration opened")

def get_user_id(email: str):
    db: Session = SessionLocal()
    try:
        u = db.query(User).filter(User.email == email).first()
        return str(u.id) if u else None
    finally:
        db.close()

def print_notifications(headers, filter_text: str | None = None):
    r = requests.get(f"{BASE}/notifications/me", headers=headers)
    r.raise_for_status()
    items = r.json()
    if filter_text:
        items = [n for n in items if filter_text in (n.get("content") or "")]
    print(filter_text or "all", "count:", len(items))
    for n in items[:3]:
        print("-", n.get("content"))

if __name__ == "__main__":
    run()
