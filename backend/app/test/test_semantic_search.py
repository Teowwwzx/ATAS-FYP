from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


def test_profiles_semantic_search_text_fallback():
    r = client.get("/api/v1/profiles/semantic-search", params={"q_text": "ai", "top_k": 3})
    assert r.status_code == 200, r.text
    assert isinstance(r.json(), list)


def test_events_semantic_search_text_fallback():
    r = client.get("/api/v1/events/semantic-search", params={"q_text": "workshop", "top_k": 3})
    assert r.status_code == 200, r.text
    assert isinstance(r.json(), list)

