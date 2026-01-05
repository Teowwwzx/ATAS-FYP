import requests, uuid, os
from datetime import datetime, timedelta, timezone

BASE = "http://127.0.0.1:8000/api/v1"

def register(email, password, full_name):
    r = requests.post(f"{BASE}/auth/register", json={"email": email, "password": password, "full_name": full_name})
    return r

def login(email, password):
    r = requests.post(f"{BASE}/auth/login", data={"username": email, "password": password})
    r.raise_for_status()
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def run():
    org_email = f"org_{uuid.uuid4().hex[:8]}@example.com"
    part_email = f"participant_{uuid.uuid4().hex[:8]}@example.com"
    password = "Password123!"
    register(org_email, password, "Organizer Test")
    register(part_email, password, "Participant Test")
    # Mark users as verified/active to allow login
    import sys
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.getcwd(), "backend", ".env"))
    sys.path.append(os.getcwd())
    sys.path.append(os.path.join(os.getcwd(), "backend"))
    from app.database.database import SessionLocal
    from app.models.user_model import User, UserStatus
    db = SessionLocal()
    try:
        for e in [org_email, part_email]:
            u = db.query(User).filter(User.email == e).first()
            if u:
                u.is_verified = True
                u.status = UserStatus.active
        db.commit()
    finally:
        db.close()
    org_headers = login(org_email, password)
    part_headers = login(part_email, password)
    
    # Create paid event
    start = datetime.now(timezone.utc) + timedelta(minutes=20)
    end = start + timedelta(hours=1)
    body = {
        "title": "Notifications Flow Event",
        "description": "Test status and payment notifications",
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
    requests.put(f"{BASE}/events/{event_id}/publish", headers=org_headers).raise_for_status()
    requests.put(f"{BASE}/events/{event_id}/registration/open", headers=org_headers).raise_for_status()
    
    # Participant joins (should be pending + payment pending)
    jp = requests.post(f"{BASE}/events/{event_id}/join", headers=part_headers)
    jp.raise_for_status()
    participant = jp.json()
    participant_id = participant["id"]
    
    # Organizer approves status
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
    
    # Fetch participant notifications
    notif = requests.get(f"{BASE}/notifications/me", headers=part_headers)
    notif.raise_for_status()
    notifs = notif.json()
    status_msgs = [n for n in notifs if "Your participation status" in (n.get("content") or "")]
    payment_msgs = [n for n in notifs if "Your payment for" in (n.get("content") or "")]
    print("status_notifications", len(status_msgs))
    for n in status_msgs[:2]:
        print("status", n.get("content"))
    print("payment_notifications", len(payment_msgs))
    for n in payment_msgs[:2]:
        print("payment", n.get("content"))

if __name__ == "__main__":
    run()
