import uuid
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models.user_model import User, UserStatus
from app.core.security import get_password_hash


def test_events_pagination(client: TestClient, db: Session):
    u = User(
        email=f"events-{uuid.uuid4().hex[:8]}@example.com",
        password=get_password_hash("pw"),
        is_verified=True,
        status=UserStatus.active,
        referral_code=uuid.uuid4().hex[:8],
    )
    db.add(u)
    db.commit()
    db.refresh(u)

    r = client.post("/api/v1/auth/login", data={"username": u.email, "password": "pw"})
    assert r.status_code == 200
    headers = {"Authorization": f"Bearer {r.json()['access_token']}"}

    for i in range(7):
        start = datetime.now(timezone.utc) + timedelta(days=5+i)
        end = start + timedelta(hours=2)
        body = {
            "title": f"Event {i}",
            "format": "workshop",
            "start_datetime": start.isoformat(),
            "end_datetime": end.isoformat(),
            "registration_type": "free",
            "visibility": "public",
        }
        cr = client.post("/api/v1/events", json=body, headers=headers)
        assert cr.status_code == 200, cr.text
        eid = cr.json()["id"]
        client.put(f"/api/v1/events/{eid}/publish", headers=headers)

    l1 = client.get("/api/v1/events", params={"upcoming": True, "page": 1, "page_size": 3})
    assert l1.status_code == 200
    assert len(l1.json()) == 3
    l2 = client.get("/api/v1/events", params={"upcoming": True, "page": 3, "page_size": 3})
    assert l2.status_code == 200
    assert len(l2.json()) >= 1

