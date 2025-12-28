import requests
import uuid
import sys

BASE_URL = "http://localhost:8000"

def run_verification():
    # 1. Register User
    email = f"test_{uuid.uuid4()}@example.com"
    password = "Password123!"
    print(f"Registering user: {email}")
    resp = requests.post(f"{BASE_URL}/auth/register", json={
        "email": email,
        "password": password,
        "full_name": "Test User"
    })
    
    # If already exists (unlikely with uuid), try login
    if resp.status_code != 200 and "already registered" not in resp.text:
        print(f"Registration failed: {resp.text}")
        return

    # 2. Login
    print("Logging in...")
    resp = requests.post(f"{BASE_URL}/auth/login", data={"username": email, "password": password})
    if resp.status_code != 200:
        print(f"Login failed: {resp.text}")
        return
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Create Org
    print("Creating Organization...")
    org_data = {
        "name": "Test Org Soft Delete",
        "type": "community",
        "description": "Test Description"
    }
    resp = requests.post(f"{BASE_URL}/organizations", json=org_data, headers=headers)
    if resp.status_code != 200:
        print(f"Create Org failed: {resp.text}")
        return
    org = resp.json()
    print(f"Org created: ID={org['id']}, Status={org['status']}")
    
    if org['status'] != 'approved':
        print("ERROR: Org status should be 'approved' by default for MVP.")
    else:
        print("SUCCESS: Org auto-approved.")

    # 4. Soft Delete Org
    print("Soft deleting Org...")
    resp = requests.delete(f"{BASE_URL}/organizations/{org['id']}", headers=headers)
    if resp.status_code != 204:
        print(f"Delete failed: {resp.text}")
        return
    print("SUCCESS: Delete request successful (204).")

    # 5. Verify Deletion
    print("Verifying deletion (checking list)...")
    resp = requests.get(f"{BASE_URL}/organizations", headers=headers)
    items = resp.json()
    found = any(o['id'] == org['id'] for o in items)
    if found:
        print("ERROR: Deleted org still in list!")
    else:
        print("SUCCESS: Org correctly hidden from list.")

    # 6. Create another Org for social features
    print("Creating Social Org...")
    org2_data = {"name": "Test Org Social", "type": "company"}
    resp = requests.post(f"{BASE_URL}/organizations", json=org2_data, headers=headers)
    org2 = resp.json()
    org2_id = org2['id']

    # 7. Follow Org
    print("Following Org...")
    resp = requests.post(f"{BASE_URL}/follows", json={"org_id": org2_id}, headers=headers)
    if resp.status_code != 200:
        print(f"Follow failed: {resp.text}")
    else:
        print("SUCCESS: Followed successfully.")

    # 8. List Org Followers
    print("Listing Org Followers...")
    resp = requests.get(f"{BASE_URL}/organizations/{org2_id}/followers", headers=headers)
    if resp.status_code != 200:
         print(f"List Followers failed: {resp.text}")
    else:
        followers = resp.json()
        print(f"Followers count: {len(followers)}")
        if len(followers) >= 1:
            print("SUCCESS: Found followers.")
        else:
            print("ERROR: Expected at least 1 follower")

    # 9. Review Org
    print("Reviewing Org...")
    review_data = {
        "org_id": org2_id,
        "rating": 5,
        "comment": "Great org!"
    }
    resp = requests.post(f"{BASE_URL}/reviews", json=review_data, headers=headers)
    if resp.status_code != 200:
        print(f"Review failed: {resp.text}")
    else:
        print("SUCCESS: Reviewed successfully.")

    # 10. List Org Reviews
    print("Listing Org Reviews...")
    resp = requests.get(f"{BASE_URL}/reviews/by-org/{org2_id}", headers=headers)
    if resp.status_code != 200:
         print(f"List Reviews failed: {resp.text}")
    else:
        reviews = resp.json()
        print(f"Reviews count: {len(reviews)}")
        if len(reviews) >= 1:
            print("SUCCESS: Found reviews.")
        else:
             print("ERROR: Expected at least 1 review")

if __name__ == "__main__":
    run_verification()
