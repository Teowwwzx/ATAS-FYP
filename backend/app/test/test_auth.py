from fastapi.testclient import TestClient

def test_user_registration(client: TestClient):
    response = client.post("/api/v1/users/", json={
        "email": "test@example.com",
        "password": "testpassword",
        "first_name": "Test",
        "last_name": "User"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert "id" in data