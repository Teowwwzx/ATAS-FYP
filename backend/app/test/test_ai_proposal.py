import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
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


def test_ai_proposal_suggest(client: TestClient, db: Session):
    try:
        # Organizer
        org = User(
            email=f"ai-org-{uuid.uuid4().hex[:8]}@example.com",
            password=get_password_hash("pw"),
            is_verified=True,
            status=UserStatus.active,
            referral_code=uuid.uuid4().hex[:8],
        )
        db.add(org)
        db.commit()
        db.refresh(org)

        headers = auth_headers(client, org.email, "pw")

        # Create event
        start = datetime.now(timezone.utc) + timedelta(days=2)
        end = start + timedelta(hours=1)
        body = {
            "title": "AI Proposal Demo",
            "format": "workshop",
            "start_datetime": start.isoformat(),
            "end_datetime": end.isoformat(),
            "registration_type": "free",
            "visibility": "public",
        }
        ce = client.post("/api/v1/events", json=body, headers=headers)
        assert ce.status_code == 200, ce.text
        event_id = ce.json()["id"]

        # Suggest
        r = client.post(
            f"/api/v1/events/{event_id}/proposals/ai-suggest",
            json={"tone": "friendly", "sections": ["title", "short_intro", "value_points"]},
            headers=headers,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ["title", "short_intro", "value_points", "logistics", "closing", "email_subjects", "raw_text"]:
            assert k in data
    finally:
        db.close()
