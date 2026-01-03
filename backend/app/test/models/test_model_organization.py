import pytest
import uuid
from sqlalchemy.orm import Session
from app.models.user_model import User
from app.models.organization_model import (
    Organization, OrganizationType, OrganizationStatus, 
    OrganizationRole, OrganizationVisibility
)
from app.core.security import get_password_hash

def create_user(db: Session, email=None) -> User:
    if not email:
        email = f"org_test_{uuid.uuid4()}@example.com"
    user = User(
        email=email,
        password=get_password_hash("test"),
        referral_code=uuid.uuid4().hex[:8],
        is_dashboard_pro=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def test_create_organization(db: Session):
    """Test creating an organization with minimum required fields"""
    owner = create_user(db)
    
    org = Organization(
        owner_id=owner.id,
        name="Test Corp",
        type=OrganizationType.company
    )
    db.add(org)
    db.commit()
    db.refresh(org)
    
    assert org.id is not None
    assert org.name == "Test Corp"
    assert org.type == OrganizationType.company
    assert org.status == OrganizationStatus.approved # Default
    assert org.owner_id == owner.id

def test_organization_bank_details(db: Session):
    """Test JSON bank details field"""
    owner = create_user(db)
    bank_info = {
        "bank_name": "Maybank",
        "account_number": "123456789",
        "holder_name": "Test Corp Sdn Bhd"
    }
    
    org = Organization(
        owner_id=owner.id,
        name="Fintech Org",
        bank_details=bank_info
    )
    db.add(org)
    db.commit()
    db.refresh(org)
    
    assert org.bank_details == bank_info
    assert org.bank_details["bank_name"] == "Maybank"

def test_organization_members(db: Session):
    """Test organization members relationship"""
    owner = create_user(db)
    member1 = create_user(db)
    member2 = create_user(db)
    
    org = Organization(owner_id=owner.id, name="Club")
    db.add(org)
    db.commit()
    
    # Add members via relationship or secondary table?
    # Organization.members is relationship
    # BUT Organization members table has 'role' column (OrganizationRole).
    # If we append to .members, role will be default (likely 'member' or null if not default).
    # Checking organization_model.py: 
    # Column('role', Enum(OrganizationRole), default=OrganizationRole.member, nullable=False)
    # So defaults work!
    
    org.members.append(member1)
    org.members.append(member2)
    db.commit()
    
    db.refresh(org)
    assert len(org.members) == 2
    
    # Verify owner relationship separate from members?
    # Usually owner is also a member, but model definition:
    # owner = relationship("User", foreign_keys=[owner_id])
    # members = relationship("User", secondary=organization_members, ...)
    # So owner is NOT automatically in members unless added.
    assert owner not in org.members

def test_organization_update_status(db: Session):
    """Test updating organization status"""
    owner = create_user(db)
    org = Organization(
        owner_id=owner.id, 
        name="Pending Org",
        status=OrganizationStatus.pending
    )
    db.add(org)
    db.commit()
    
    org.status = OrganizationStatus.approved
    db.commit()
    db.refresh(org)
    
    assert org.status == OrganizationStatus.approved

def test_delete_organization(db: Session):
    """Test deleting organization"""
    owner = create_user(db)
    org = Organization(owner_id=owner.id, name="Delete Me")
    db.add(org)
    db.commit()
    
    org_id = org.id
    db.delete(org)
    db.commit()
    
    assert db.query(Organization).filter(Organization.id == org_id).first() is None
    # User should remain
    db.refresh(owner)
    assert owner is not None
