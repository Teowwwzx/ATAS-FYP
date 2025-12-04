import uuid
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database.database import get_db
from app.models.user_model import User, UserStatus, Role
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


def create_user(db: Session, email: str, password: str, roles: list[str] = None) -> User:
    u = User(email=email, password=get_password_hash(password), is_verified=True, status=UserStatus.active, referral_code=uuid.uuid4().hex[:8])
    db.add(u)
    db.commit()
    db.refresh(u)
    if roles:
        for name in roles:
            r = db.query(Role).filter(Role.name == name).first()
            if r is None:
                r = Role(name=name)
                db.add(r)
                db.commit()
                db.refresh(r)
            u.roles.append(r)
        db.commit()
        db.refresh(u)
    return u


def create_event(client: TestClient, headers):
    start = datetime.now(timezone.utc) + timedelta(days=1)
    end = start + timedelta(hours=2)
    body = {
        "title": "Role Test Event",
        "format": "workshop",
        "start_datetime": start.isoformat(),
        "end_datetime": end.isoformat(),
        "registration_type": "free",
        "visibility": "public",
    }
    r = client.post("/api/v1/events", json=body, headers=headers)
    assert r.status_code == 200
    return r.json()


def test_publish_unpublish_requires_organizer(client: TestClient):
    db = setup_db()
    try:
        a = create_user(db, "org@example.com", "pw")
        b = create_user(db, "user@example.com", "pw")
        ha = auth_headers(client, a.email, "pw")
        hb = auth_headers(client, b.email, "pw")
        e = create_event(client, ha)
        eid = e["id"]
        r = client.put(f"/api/v1/events/{eid}/publish", headers=hb)
        assert r.status_code == 403
        r = client.put(f"/api/v1/events/{eid}/publish", headers=ha)
        assert r.status_code == 200
        r = client.put(f"/api/v1/events/{eid}/unpublish", headers=hb)
        assert r.status_code == 403
        r = client.put(f"/api/v1/events/{eid}/unpublish", headers=ha)
        assert r.status_code == 200
    finally:
        db.close()


def test_delete_requires_organizer(client: TestClient):
    db = setup_db()
    try:
        a = create_user(db, "org2@example.com", "pw")
        b = create_user(db, "user2@example.com", "pw")
        ha = auth_headers(client, a.email, "pw")
        hb = auth_headers(client, b.email, "pw")
        e = create_event(client, ha)
        eid = e["id"]
        r = client.delete(f"/api/v1/events/{eid}", headers=hb)
        assert r.status_code == 403
        r = client.delete(f"/api/v1/events/{eid}", headers=ha)
        assert r.status_code == 204
    finally:
        db.close()


def test_proposal_update_delete_requires_committee_or_organizer(client: TestClient):
    db = setup_db()
    try:
        a = create_user(db, "org3@example.com", "pw")
        b = create_user(db, "user3@example.com", "pw")
        ha = auth_headers(client, a.email, "pw")
        hb = auth_headers(client, b.email, "pw")
        e = create_event(client, ha)
        eid = e["id"]
        client.put(f"/api/v1/events/{eid}/publish", headers=ha)
        rp = client.post(f"/api/v1/events/{eid}/proposals", headers=ha)
        assert rp.status_code == 200
        proposal_id = rp.json()["id"]
        r = client.put(f"/api/v1/events/{eid}/proposals/{proposal_id}", json={"title": "x"}, headers=hb)
        assert r.status_code == 403
        r = client.delete(f"/api/v1/events/{eid}/proposals/{proposal_id}", headers=hb)
        assert r.status_code == 403
        r = client.put(f"/api/v1/events/{eid}/proposals/{proposal_id}", json={"title": "y"}, headers=ha)
        assert r.status_code == 200
        r = client.delete(f"/api/v1/events/{eid}/proposals/{proposal_id}", headers=ha)
        assert r.status_code == 204
    finally:
        db.close()


def test_comment_update_delete_author_or_committee(client: TestClient):
    db = setup_db()
    try:
        a = create_user(db, "org4@example.com", "pw")
        c = create_user(db, "user4@example.com", "pw")
        d = create_user(db, "user5@example.com", "pw")
        ha = auth_headers(client, a.email, "pw")
        hc = auth_headers(client, c.email, "pw")
        hd = auth_headers(client, d.email, "pw")
        e = create_event(client, ha)
        eid = e["id"]
        client.put(f"/api/v1/events/{eid}/publish", headers=ha)
        rc = client.post(f"/api/v1/events/{eid}/participants", json={"user_id": str(c.id), "role": "audience"}, headers=ha)
        assert rc.status_code == 200
        rp = client.post(f"/api/v1/events/{eid}/proposals", headers=ha)
        proposal_id = rp.json()["id"]
        cm = client.post(f"/api/v1/events/{eid}/proposals/{proposal_id}/comments", json={"content": "hi"}, headers=hc)
        assert cm.status_code == 200
        comment_id = cm.json()["id"]
        r = client.put(f"/api/v1/events/{eid}/proposals/{proposal_id}/comments/{comment_id}", json={"content": "new"}, headers=hd)
        assert r.status_code == 403
        r = client.put(f"/api/v1/events/{eid}/proposals/{proposal_id}/comments/{comment_id}", json={"content": "new2"}, headers=ha)
        assert r.status_code == 200
        r = client.delete(f"/api/v1/events/{eid}/proposals/{proposal_id}/comments/{comment_id}", headers=hd)
        assert r.status_code == 403
        r = client.delete(f"/api/v1/events/{eid}/proposals/{proposal_id}/comments/{comment_id}", headers=hc)
        assert r.status_code == 204
    finally:
        db.close()


def test_category_admin_update_delete_requires_admin(client: TestClient):
    db = setup_db()
    try:
        a = create_user(db, "user6@example.com", "pw")
        b = create_user(db, "admin@example.com", "pw", roles=["admin"])
        ha = auth_headers(client, a.email, "pw")
        hb = auth_headers(client, b.email, "pw")
        r = client.post("/api/v1/categories", json={"name": "AI"}, headers=ha)
        assert r.status_code == 200
        cid = r.json()["id"]
        r = client.put(f"/api/v1/categories/{cid}", json={"name": "ML"}, headers=ha)
        assert r.status_code == 403
        r = client.put(f"/api/v1/categories/{cid}", json={"name": "ML"}, headers=hb)
        assert r.status_code == 200
        r = client.delete(f"/api/v1/categories/{cid}", headers=ha)
        assert r.status_code == 403
        r = client.delete(f"/api/v1/categories/{cid}", headers=hb)
        assert r.status_code == 204
    finally:
        db.close()


def test_users_admin_requires_admin(client: TestClient):
    db = setup_db()
    try:
        a = create_user(db, "user7@example.com", "pw")
        b = create_user(db, "admin2@example.com", "pw", roles=["admin"])
        ha = auth_headers(client, a.email, "pw")
        hb = auth_headers(client, b.email, "pw")
        r = client.get("/api/v1/users", headers=ha)
        assert r.status_code == 403
        r = client.get("/api/v1/users", headers=hb)
        assert r.status_code == 200
    finally:
        db.close()

