
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user_model import User, UserStatus, Role
from app.models.organization_model import Organization, OrganizationType, OrganizationVisibility
from app.models.event_model import Event, EventFormat, EventType, EventRegistrationType, EventVisibility
from app.core.security import get_password_hash
import uuid
from datetime import datetime, timedelta

def auth_headers(client: TestClient, email: str, password: str):
    response = client.post("/api/v1/auth/login", data={"username": email, "password": password})
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_fintech_phase1_endpoints(client: TestClient, db: Session):
    # 1. Setup Admin User
    if db.query(Role).filter(Role.name == "admin").first() is None:
        db.add(Role(name="admin"))
    db.commit()

    admin_email = f"fintech_admin_{uuid.uuid4()}@example.com"
    admin = User(
        email=admin_email,
        password=get_password_hash("pw"),
        is_verified=True,
        status=UserStatus.active,
        referral_code=uuid.uuid4().hex[:8],
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    
    # Assign admin role
    from app.services.user_service import assign_role_to_user
    assign_role_to_user(db, admin, "admin")

    headers = auth_headers(client, admin_email, "pw")

    # 2. Test Organization Bank Details (Create)
    org_data = {
        "name": "Fintech Club",
        "type": OrganizationType.community.value,
        "visibility": OrganizationVisibility.public.value,
        "bank_details": {
            "bank_name": "Maybank",
            "account_number": "1122334455",
            "holder_name": "Fintech Club Treasury"
        }
    }
    resp = client.post("/api/v1/organizations", json=org_data, headers=headers)
    assert resp.status_code == 200, resp.text
    org_id = resp.json()["id"]
    assert resp.json()["bank_details"]["bank_name"] == "Maybank"

    # 3. Test Organization Bank Details (Update)
    update_data = {
        "bank_details": {
            "bank_name": "CIMB",
            "account_number": "9988776655",
            "holder_name": "Fintech Club Treasury Updated"
        }
    }
    resp = client.put(f"/api/v1/organizations/{org_id}", json=update_data, headers=headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["bank_details"]["bank_name"] == "CIMB"

    # 4. Test Event Price & Currency (Create)
    start_time = datetime.utcnow() + timedelta(days=1)
    end_time = start_time + timedelta(hours=2)
    
    event_data = {
        "title": "Paid Workshop",
        "format": "workshop",
        "start_datetime": start_time.isoformat(),
        "end_datetime": end_time.isoformat(),
        "registration_type": "paid",
        "price": 50.00,
        "currency": "MYR"
    }
    resp = client.post("/api/v1/events", json=event_data, headers=headers)
    assert resp.status_code == 200, resp.text
    event_id = resp.json()["id"]
    assert resp.json()["price"] == 50.0
    assert resp.json()["currency"] == "MYR"

    # 5. Test Event Price & Currency (Update)
    update_event_data = {
        "price": 75.00,
        "currency": "USD"
    }
    resp = client.put(f"/api/v1/events/{event_id}", json=update_event_data, headers=headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["price"] == 75.0
    assert resp.json()["currency"] == "USD"
    
    print("\nFintech Phase 1 Verification Passed!")
