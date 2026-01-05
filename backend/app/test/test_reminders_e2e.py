import requests
import uuid
import os
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from sqlalchemy.orm import Session
import sys
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), "backend"))
load_dotenv(os.path.join(os.getcwd(), "backend", ".env"))
from app.database.database import SessionLocal
from app.models.user_model import User, UserStatus
from app.models.communication_log_model import CommunicationLog, CommunicationType
BASE = "http://127.0.0.1:8000/api/v1"
def register_and_login(email: str, password: str, full_name: str):
    requests.post(f"{BASE}/auth/register", json={"email": email, "password": password, "full_name": full_name})
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
    org_email = f"org_{uuid.uuid4().hex[:8]}@example.com"
    part_email = f"participant_{uuid.uuid4().hex[:8]}@example.com"
    password = "Password123!"
    org_headers = register_and_login(org_email, password, "Organizer Test")
    part_headers = register_and_login(part_email, password, "Participant Test")
    start = datetime.now(timezone.utc) + timedelta(minutes=10)
    end = start + timedelta(hours=2)
    body = {
        "title": "Reminder Test Event",
        "description": "Testing reminders",
        "format": "workshop",
        "type": "physical",
        "start_datetime": start.isoformat(),
        "end_datetime": end.isoformat(),
        "registration_type": "free",
        "visibility": "public",
        "auto_accept_registration": True,
    }
    r = requests.post(f"{BASE}/events", json=body, headers=org_headers)
    r.raise_for_status()
    event_id = r.json()["id"]
    requests.put(f"{BASE}/events/{event_id}/publish", headers=org_headers).raise_for_status()
    requests.put(f"{BASE}/events/{event_id}/registration/open", headers=org_headers).raise_for_status()
    requests.post(f"{BASE}/events/{event_id}/join", headers=part_headers).raise_for_status()
    for opt in ["one_week", "three_days", "one_day"]:
        requests.post(f"{BASE}/events/{event_id}/reminders", json={"option": opt}, headers=part_headers).raise_for_status()
    run = requests.post(f"{BASE}/events/reminders/run", headers=part_headers)
    print("run_status", run.status_code)
    processed = run.json() if run.status_code == 200 else []
    print("processed", [r.get("option") for r in processed])
    notif = requests.get(f"{BASE}/notifications/me", headers=part_headers)
    notif.raise_for_status()
    notifs = notif.json()
    reminder_notifs = [n for n in notifs if "Reminder:" in (n.get("content") or "")]
    print("notif_count", len(reminder_notifs))
    for n in reminder_notifs[:3]:
        print("notif", n.get("content"))
    session = SessionLocal()
    try:
        logs = session.query(CommunicationLog).filter(
            CommunicationLog.type == CommunicationType.EMAIL,
            CommunicationLog.recipient == part_email
        ).order_by(CommunicationLog.created_at.desc()).all()
        remind_logs = [l for l in logs if (l.metadata_payload or {}).get("type") == "event_reminder"]
        print("email_count", len(remind_logs))
        for l in remind_logs[:3]:
            print("email_status", str(l.status), l.subject)
    finally:
        session.close()
if __name__ == "__main__":
    run()
