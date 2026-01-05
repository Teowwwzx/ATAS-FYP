import pytest
from unittest.mock import patch

# Mock Cloudinary upload to avoid external calls
@pytest.fixture(autouse=True)
def mock_upload_file():
    with patch("app.routers.event_router.upload_file", return_value="http://mock.url/file.jpg"), \
         patch("app.routers.organization_router.upload_file", return_value="http://mock.url/logo.jpg"):
        yield

def test_read_main(client):
    response = client.get("/")
    assert response.status_code == 404 # Root not defined or 200 if docs. Assume 404 for API root.

def test_auth_and_profile(client, student_token_headers):
    # Test Get Me
    response = client.get("/api/v1/auth/me", headers=student_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "student@test.com"
    
    # Test Update Profile (Tags/Intents)
    profile_update = {
        "full_name": "Updated Student",
        "intents": ["hiring_talent", "open_to_speak"],
        "today_status": "Testing!"
    }
    response = client.put("/api/v1/profiles/me", json=profile_update, headers=student_token_headers)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["full_name"] == "Updated Student"
    assert "hiring_talent" in res_data["intents"]

def test_organization_flow(client, admin_token_headers):
    # 1. Create Organization
    org_data = {
        "name": "Test Org",
        "description": "A test organization",
        "type": "company",
        "visibility": "public"
    }
    response = client.post("/api/v1/organizations", json=org_data, headers=admin_token_headers)
    assert response.status_code == 200
    org = response.json()
    org_id = org["id"]
    assert org["name"] == "Test Org"
    
    # 2. Update Logo (Mocked)
    # Prepare dummy file
    files = {'file': ('logo.png', b'fakecontent', 'image/png')}
    response = client.put(f"/api/v1/organizations/{org_id}/logo", files=files, headers=admin_token_headers)
    assert response.status_code == 200
    
    # 3. Get Organization details
    response = client.get(f"/api/v1/organizations/{org_id}", headers=admin_token_headers)
    assert response.status_code == 200
    assert response.json()["id"] == org_id

def test_event_and_proposal_flow(client, admin_token_headers, student_token_headers):
    # 1. Admin creates an organization (needed for event)
    org_data = {"name": "Event Org", "type": "community", "visibility": "public"}
    org_res = client.post("/api/v1/organizations", json=org_data, headers=admin_token_headers)
    org_id = org_res.json()["id"]

    # 2. Admin creates an event
    event_data = {
        "title": "Test Event",
        "description": "Testing events",
        "type": "physical", 
        "format": "conference",
        "start_datetime": "2025-12-01T10:00:00Z",
        "end_datetime": "2025-12-01T18:00:00Z",
        "registration_type": "free",
        "visibility": "public",
        "organization_id": org_id,
        "is_attendance_enabled": True
    }
    event_res = client.post("/api/v1/events", json=event_data, headers=admin_token_headers)
    assert event_res.status_code == 200
    event = event_res.json()
    event_id = event["id"]
    
    # 3. Publish Event
    pub_res = client.post(f"/api/v1/events/{event_id}/publish", headers=admin_token_headers)
    assert pub_res.status_code == 200
    
    # 4. Student creates a proposal with file
    # This was the source of the 502 error before
    
    # Simulate FormData
    # Content-Type header should be handled by requests/TestClient automatically
    files = {'file': ('proposal.pdf', b'%PDF-1.4...', 'application/pdf')}
    data = {
        'title': 'My Great Proposal',
        'description': 'I want to speak about testing.'
    }
    
    # Note: Using student token
    prop_res = client.post(
        f"/api/v1/events/{event_id}/proposals",
        data=data, # Use data for form fields
        files=files, # Use files for file uploads
        headers=student_token_headers
    )
    
    # If this returns 200, the fix is verified (no 502)
    assert prop_res.status_code == 200
    proposal = prop_res.json()
    assert proposal["title"] == "My Great Proposal"
    assert proposal["file_url"] == "http://mock.url/file.jpg" # From mock
    
    # 5. List proposals (Admin)
    list_res = client.get(f"/api/v1/events/{event_id}/proposals", headers=admin_token_headers)
    assert list_res.status_code == 200
    items = list_res.json()
    assert len(items) >= 1
    assert items[0]["id"] == proposal["id"]

def test_checklist_flow(client, admin_token_headers):
    # Setup: Create Org and Event
    org_data = {"name": "Checklist Org", "type": "company", "visibility": "public"}
    org_id = client.post("/api/v1/organizations", json=org_data, headers=admin_token_headers).json()["id"]
    
    event_data = {
        "title": "Checklist Event", 
        "format": "workshop",
        "type": "online",
        "registration_type": "free",
        "visibility": "public",
        "start_datetime": "2025-01-01T09:00:00Z",
        "end_datetime": "2025-01-01T17:00:00Z",
        "organization_id": org_id
    }
    event_id = client.post("/api/v1/events", json=event_data, headers=admin_token_headers).json()["id"]
    
    # Add Checklist Item
    item_data = {
        "title": "Book Venue",
        "description": "Call the hotel",
        "visibility": "internal"
    }
    res = client.post(f"/api/v1/events/{event_id}/checklist", json=item_data, headers=admin_token_headers)
    assert res.status_code == 200
    item = res.json()
    assert item["title"] == "Book Venue"
    
    # List Items
    res = client.get(f"/api/v1/events/{event_id}/checklist", headers=admin_token_headers)
    assert res.status_code == 200
    assert len(res.json()) == 1

