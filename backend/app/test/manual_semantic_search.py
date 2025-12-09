from fastapi.testclient import TestClient
from app.main import app


def main():
    client = TestClient(app)
    r1 = client.get("/api/v1/profiles/semantic-search", params={"q_text": "ai", "top_k": 2})
    print("profiles semantic-search status:", r1.status_code)
    print("profiles sample:", r1.json())

    r2 = client.get("/api/v1/events/semantic-search", params={"q_text": "workshop", "top_k": 2})
    print("events semantic-search status:", r2.status_code)
    print("events sample:", r2.json())


if __name__ == "__main__":
    main()

