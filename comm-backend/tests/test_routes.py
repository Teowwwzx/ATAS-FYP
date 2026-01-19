from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"

def test_auth_routes_exist():
    r = client.post("/v1/auth/register", json={})
    assert r.status_code in (400, 422)
    r = client.post("/v1/auth/login", json={})
    assert r.status_code in (400, 422)

def test_posts_route_exists():
    r = client.get("/v1/posts")
    assert r.status_code in (200, 401, 500)

def test_feed_routes_exist():
    r = client.get("/v1/feed/latest")
    assert r.status_code in (200, 500)
    r = client.get("/v1/feed/recommend")
    assert r.status_code in (200, 500)
