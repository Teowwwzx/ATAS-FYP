from fastapi.testclient import TestClient
from app.main import app
from app.core.security import get_password_hash
from app.database.database import SessionLocal
from app.models.user_model import User, UserStatus
from app.schemas.user_schema import UserCreate
from app.services.user_service import create_user
from datetime import datetime, timedelta, timezone


def seed_event_and_search():
    # Setup DB and user (directly in Neon)
    db = SessionLocal()
    u = db.query(User).filter(User.email == "demo.searcher@example.com").first()
    if u is None:
        u = create_user(db, UserCreate(email="demo.searcher@example.com", password="pw"))
        u.is_verified = True
        u.status = UserStatus.active
        db.add(u)
        db.commit()
        db.refresh(u)
    db.close()

    client = TestClient(app)
    auth = client.post("/api/v1/auth/login", data={"username": "demo.searcher@example.com", "password": "pw"})
    token = auth.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    start = datetime.now(timezone.utc) + timedelta(days=1)
    end = start + timedelta(hours=2)
    body = {
        "title": "AI Workshop on LLM Applications",
        "format": "workshop",
        "start_datetime": start.isoformat(),
        "end_datetime": end.isoformat(),
        "registration_type": "free",
        "visibility": "public",
    }
    ce = client.post("/api/v1/events", json=body, headers=headers)
    print("create event status:", ce.status_code)

    r = client.get("/api/v1/events/semantic-search", params={"q_text": "workshop", "top_k": 5})
    print("searcher:", "demo.searcher@example.com")
    print("results:", r.json())


if __name__ == "__main__":
    seed_event_and_search()
