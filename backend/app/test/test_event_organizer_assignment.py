import uuid
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database.database import get_db
from app.models.user_model import User, UserStatus
from app.core.security import get_password_hash


def setup_db():
    # Reuse the override db from conftest
    for dep, func in app.dependency_overrides.items():
        if dep is get_db:
            gen = func()
            db = next(gen)
            return db
    raise RuntimeError("get_db override not found")


def auth_headers(client: TestClient, email: str, password: str):
    resp = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password},
    )
    assert resp.status_code == 200, f"Login failed: {resp.status_code} {resp.text}"
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_creator_is_assigned_organizer_role(client: TestClient):
    db: Session = setup_db()
    try:
        # Create and verify a user
        email = "organizer@example.com"
        password = "password"
        u = User(
            email=email,
            password=get_password_hash(password),
            is_verified=True,
            status=UserStatus.active,
            referral_code=uuid.uuid4().hex[:8],
        )
        db.add(u)
        db.commit()
        db.refresh(u)

        headers = auth_headers(client, email, password)

        # Create an event
        start = datetime.now(timezone.utc) + timedelta(days=1)
        end = start + timedelta(hours=2)
        body = {
            "title": "My Test Event",
            "description": "",
            "format": "workshop",
            "start_datetime": start.isoformat(),
            "end_datetime": end.isoformat(),
            "registration_type": "free",
            "visibility": "public",
        }
        r = client.post("/api/v1/events", json=body, headers=headers)
        assert r.status_code == 200, r.text
        event = r.json()
        event_id = event["id"]

        # Check participants include organizer link
        rp = client.get(f"/api/v1/events/{event_id}/participants", headers=headers)
        assert rp.status_code == 200, rp.text
        participants = rp.json()
        # Find self link
        me_links = [p for p in participants if p["user_id"] == str(u.id)]
        assert me_links, "Creator should be a participant"
        assert any(p["role"] == "organizer" for p in me_links), "Creator should have organizer role"

        # Check events/mine reflects organizer role
        rm = client.get("/api/v1/events/mine", headers=headers)
        assert rm.status_code == 200, rm.text
        mine = rm.json()
        mine_item = next((m for m in mine if m["event_id"] == event_id), None)
        assert mine_item is not None, "Created event should appear in my events"
        assert mine_item["my_role"] == "organizer", "my_role should be organizer"

        # Organizer should be able to update
        upd = client.put(f"/api/v1/events/{event_id}", json={"title": "Updated Title"}, headers=headers)
        assert upd.status_code == 200, upd.text
        assert upd.json()["title"] == "Updated Title"
    finally:
        db.close()
