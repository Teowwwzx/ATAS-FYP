from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import uuid

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


def test_admin_tags_and_skills_crud(client: TestClient):
    db = setup_db()
    try:
        admin = create_user(db, "admintax@example.com", "pw", roles=["admin"])
        user = create_user(db, "usertax@example.com", "pw")
        ha = auth_headers(client, admin.email, "pw")
        hu = auth_headers(client, user.email, "pw")

        # Non-admin cannot create
        r = client.post("/api/v1/tags", json={"name": "AI"}, headers=hu)
        assert r.status_code == 403
        r = client.post("/api/v1/skills", json={"name": "Python"}, headers=hu)
        assert r.status_code == 403

        # Admin create
        r = client.post("/api/v1/tags", json={"name": "AI"}, headers=ha)
        assert r.status_code == 200
        tag_id = r.json()["id"]
        r = client.post("/api/v1/skills", json={"name": "Python"}, headers=ha)
        assert r.status_code == 200
        skill_id = r.json()["id"]

        # List open
        lt = client.get("/api/v1/tags")
        assert lt.status_code == 200 and any(t["name"] == "AI" for t in lt.json())
        ls = client.get("/api/v1/skills")
        assert ls.status_code == 200 and any(s["name"] == "Python" for s in ls.json())

        # Non-admin cannot update/delete
        r = client.put(f"/api/v1/tags/{tag_id}", json={"name": "ML"}, headers=hu)
        assert r.status_code == 403
        r = client.delete(f"/api/v1/tags/{tag_id}", headers=hu)
        assert r.status_code == 403
        r = client.put(f"/api/v1/skills/{skill_id}", json={"name": "Python 3"}, headers=hu)
        assert r.status_code == 403
        r = client.delete(f"/api/v1/skills/{skill_id}", headers=hu)
        assert r.status_code == 403

        # Admin update/delete
        r = client.put(f"/api/v1/tags/{tag_id}", json={"name": "ML"}, headers=ha)
        assert r.status_code == 200 and r.json()["name"] == "ML"
        r = client.put(f"/api/v1/skills/{skill_id}", json={"name": "Python 3"}, headers=ha)
        assert r.status_code == 200 and r.json()["name"] == "Python 3"
        r = client.delete(f"/api/v1/tags/{tag_id}", headers=ha)
        assert r.status_code == 204
        r = client.delete(f"/api/v1/skills/{skill_id}", headers=ha)
        assert r.status_code == 204
    finally:
        db.close()

