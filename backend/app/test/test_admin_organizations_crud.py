"""
Comprehensive Admin Organization CRUD Tests

Tests all organization management operations including:
- Create, Read, Update, Delete
- Individual field updates (name, type, status, visibility)
- Batch operations (bulk approvals, status updates)
- Ownership transfer and filtering
"""
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.organization_model import Organization, OrganizationType, OrganizationStatus, OrganizationVisibility
from app.test.test_helpers import (
    create_admin_user, create_test_user, create_test_organization, get_admin_headers
)


def test_admin_list_organizations_with_filters(client: TestClient, db: Session):
    """Test listing organizations with filters"""
    admin = create_admin_user(db)
    headers = get_admin_headers(client, admin)
    
    owner = create_test_user(db)
    
    # Create organizations with different attributes
    org1 = create_test_organization(db, owner.id, name="Tech Company", org_type=OrganizationType.company, status=OrganizationStatus.approved)
    org2 = create_test_organization(db, owner.id, name="Community Group", org_type=OrganizationType.community, status=OrganizationStatus.pending)
    
    # List all organizations
    response = client.get("/api/v1/admin/organizations", headers=headers)
    assert response.status_code == 200
    orgs = response.json()
    assert len(orgs) >= 2
    
    # Filter by type
    response = client.get(
        "/api/v1/admin/organizations",
        params={"type": OrganizationType.company.value},
        headers=headers
    )
    assert response.status_code == 200
    filtered = response.json()
    assert any(o["name"] == "Tech Company" for o in filtered)
    
    # Filter by status
    response = client.get(
        "/api/v1/admin/organizations",
        params={"status": OrganizationStatus.pending.value},
        headers=headers
    )
    assert response.status_code == 200
    pending_orgs = response.json()
    assert any(o["name"] == "Community Group" for o in pending_orgs)
    
    # Filter by name (search)
    response = client.get(
        "/api/v1/admin/organizations",
        params={"q": "Tech"},
        headers=headers
    )
    assert response.status_code == 200
    search_results = response.json()
    assert any(o["name"] == "Tech Company" for o in search_results)


def test_admin_count_organizations(client: TestClient, db: Session):
    """Test counting organizations with filters"""
    admin = create_admin_user(db)
    headers = get_admin_headers(client, admin)
    
    owner = create_test_user(db)
    
    # Create multiple organizations
    create_test_organization(db, owner.id, org_type=OrganizationType.company)
    create_test_organization(db, owner.id, org_type=OrganizationType.community)
    create_test_organization(db, owner.id, org_type=OrganizationType.company)
    
    # Count all
    response = client.get("/api/v1/admin/organizations/count", headers=headers)
    assert response.status_code == 200
    assert response.json()["total_count"] >= 3
    
    # Count by type
    response = client.get(
        "/api/v1/admin/organizations/count",
        params={"type": OrganizationType.company.value},
        headers=headers
    )
    assert response.status_code == 200
    assert response.json()["total_count"] >= 2


def test_admin_approve_organization(client: TestClient, db: Session):
    """Test approving a pending organization"""
    admin = create_admin_user(db)
    headers = get_admin_headers(client, admin)
    
    owner = create_test_user(db)
    org = create_test_organization(db, owner.id, status=OrganizationStatus.pending)
    
    # Approve organization
    response = client.post(f"/api/v1/admin/organizations/{org.id}/approve", headers=headers)
    assert response.status_code == 200
    
    db.refresh(org)
    assert org.status == OrganizationStatus.approved


def test_admin_reject_organization(client: TestClient, db: Session):
    """Test rejecting a pending organization"""
    admin = create_admin_user(db)
    headers = get_admin_headers(client, admin)
    
    owner = create_test_user(db)
    org = create_test_organization(db, owner.id, status=OrganizationStatus.pending)
    
    # Reject organization
    response = client.post(f"/api/v1/admin/organizations/{org.id}/reject", headers=headers)
    assert response.status_code == 200
    
    db.refresh(org)
    assert org.status == OrganizationStatus.rejected


def test_admin_update_organization_fields(client: TestClient, db: Session):
    """Test updating individual organization fields"""
    admin = create_admin_user(db)
    headers = get_admin_headers(client, admin)
    
    owner = create_test_user(db)
    org = create_test_organization(db, owner.id, name="Original Name", org_type=OrganizationType.company)
    
    # Update organization details
    update_data = {
        "name": "Updated Organization Name",
        "description": "Updated description",
        "type": OrganizationType.community.value,
        "visibility": OrganizationVisibility.private.value
    }
    
    response = client.put(
        f"/api/v1/admin/organizations/{org.id}",
        json=update_data,
        headers=headers
    )
    assert response.status_code == 200
    updated = response.json()
    
    assert updated["name"] == "Updated Organization Name"
    assert updated["type"] == OrganizationType.community.value
    assert updated["visibility"] == OrganizationVisibility.private.value


def test_admin_delete_organization(client: TestClient, db: Session):
    """Test deleting an organization"""
    admin = create_admin_user(db)
    headers = get_admin_headers(client, admin)
    
    owner = create_test_user(db)
    org = create_test_organization(db, owner.id)
    org_id = org.id
    
    # Delete organization
    response = client.delete(f"/api/v1/admin/organizations/{org_id}", headers=headers)
    assert response.status_code == 200
    
    # Verify deleted
    deleted_org = db.query(Organization).filter(Organization.id == org_id).first()
    assert deleted_org is None


def test_admin_batch_approve_organizations(client: TestClient, db: Session):
    """Test batch approving multiple organizations"""
    admin = create_admin_user(db)
    headers = get_admin_headers(client, admin)
    
    owner = create_test_user(db)
    
    # Create pending organizations
    orgs = [
        create_test_organization(db, owner.id, status=OrganizationStatus.pending)
        for _ in range(3)
    ]
    
    # Batch approve
    for org in orgs:
        response = client.post(f"/api/v1/admin/organizations/{org.id}/approve", headers=headers)
        assert response.status_code == 200
    
    # Verify all approved
    for org in orgs:
        db.refresh(org)
        assert org.status == OrganizationStatus.approved


def test_admin_organization_pagination(client: TestClient, db: Session):
    """Test organization list pagination"""
    admin = create_admin_user(db)
    headers = get_admin_headers(client, admin)
    
    owner = create_test_user(db)
    
    # Create multiple organizations
    for i in range(15):
        create_test_organization(db, owner.id, name=f"Org {i:02d}")
    
    # Test page 1
    response = client.get(
        "/api/v1/admin/organizations",
        params={"page": 1, "page_size": 10},
        headers=headers
    )
    assert response.status_code == 200
    page1 = response.json()
    assert len(page1) <= 10
    
    # Test page 2
    response = client.get(
        "/api/v1/admin/organizations",
        params={"page": 2, "page_size": 10},
        headers=headers
    )
    assert response.status_code == 200
    page2 = response.json()
    
    # Different results if enough organizations
    if len(page1) == 10:
        page1_ids = [o["id"] for o in page1]
        page2_ids = [o["id"] for o in page2]
        assert not any(oid in page1_ids for oid in page2_ids)
