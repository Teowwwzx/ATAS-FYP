from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import uuid
from datetime import datetime, timedelta, timezone

from app.main import app
from app.database.database import get_db
from app.models.user_model import User, UserStatus
from app.core.security import get_password_hash


def setup_db():
    for dep, func in app.dependency_overrides.items():
        if dep is get_db:
            gen = func()
            db = next(gen)
            return db
    raise RuntimeError("get_db override not found")


def auth_headers(client: TestClient, email: str, password: str):
    resp = client.post("/api/v1/auth/login", data={"username": email, "password": password})
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def create_user_and_event(client: TestClient, db: Session):
    email = f"dash{uuid.uuid4().hex[:6]}@example.com"
    password = "pw"
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
    start = datetime.now(timezone.utc) + timedelta(days=3)
    end = start + timedelta(hours=2)
    body = {
        "title": "Dashboard Event",
        "format": "workshop",
        "start_datetime": start.isoformat(),
        "end_datetime": end.isoformat(),
        "registration_type": "free",
        "visibility": "public",
    }
    r = client.post("/api/v1/events", json=body, headers=headers)
    assert r.status_code == 200
    return u, headers, r.json()


def test_list_my_reminders_and_checklist(client: TestClient):
    db = setup_db()
    try:
        u, headers, event = create_user_and_event(client, db)
        eid = event["id"]
        # Create reminder
        rr = client.post(f"/api/v1/events/{eid}/reminders", json={"option": "three_days"}, headers=headers)
        assert rr.status_code == 200
        # Create checklist item
        ci = client.post(
            f"/api/v1/events/{eid}/checklist",
            json={"title": "Prepare slides", "assigned_user_id": str(u.id)},
            headers=headers,
        )
        assert ci.status_code == 200

        lm = client.get("/api/v1/events/reminders/me?upcoming_only=false", headers=headers)
        assert lm.status_code == 200
        assert len(lm.json()) >= 1

        lc = client.get("/api/v1/events/checklist/me", headers=headers)
        assert lc.status_code == 200
        items = lc.json()
        assert any(i["title"] == "Prepare slides" for i in items)
    finally:
        db.close()
