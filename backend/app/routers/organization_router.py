from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
from app.database.database import get_db
from app.models.organization_model import Organization, OrganizationVisibility, OrganizationType
from app.schemas.organization_schema import (
    OrganizationResponse,
    OrganizationCreate,
    OrganizationUpdate,
    OrganizationMemberCreate,
    OrganizationMemberUpdate,
    OrganizationMemberResponse,
)
from app.dependencies import require_roles
from app.models.user_model import User
from app.models.organization_model import organization_members, OrganizationRole
from sqlalchemy import select
from app.services.audit_service import log_admin_action

router = APIRouter()

@router.get("/organizations", response_model=list[OrganizationResponse])
def list_organizations(
    name: str | None = None,
    visibility: OrganizationVisibility | None = None,
    type: OrganizationType | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
):
    q = db.query(Organization)
    if visibility is None:
        q = q.filter(Organization.visibility == OrganizationVisibility.public)
    else:
        q = q.filter(Organization.visibility == visibility)
    if name:
        q = q.filter(Organization.name.ilike(f"%{name}%"))
    if type:
        q = q.filter(Organization.type == type)
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20
    items = (
        q.order_by(Organization.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return items

@router.get("/organizations/count")
def get_organizations_count(
    name: str | None = None,
    visibility: OrganizationVisibility | None = None,
    type: OrganizationType | None = None,
    db: Session = Depends(get_db),
):
    q = db.query(Organization)
    if visibility is None:
        q = q.filter(Organization.visibility == OrganizationVisibility.public)
    else:
        q = q.filter(Organization.visibility == visibility)
    if name:
        q = q.filter(Organization.name.ilike(f"%{name}%"))
    if type:
        q = q.filter(Organization.type == type)
    total = q.with_entities(Organization.id).distinct().count()
    return {"total_count": total}

@router.get("/organizations/{org_id}", response_model=OrganizationResponse)
def get_organization(org_id: uuid.UUID, db: Session = Depends(get_db)):
    item = db.query(Organization).filter(Organization.id == org_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    return item

@router.post("/organizations", response_model=OrganizationResponse)
def create_organization(body: OrganizationCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["admin"]))):
    item = Organization(**body.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    log_admin_action(db, current_user.id, "organization.create", "organization", item.id)
    return item

@router.put("/organizations/{org_id}", response_model=OrganizationResponse)
def update_organization(org_id: uuid.UUID, body: OrganizationUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["admin"]))):
    item = db.query(Organization).filter(Organization.id == org_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    update_data = body.model_dump(exclude_unset=True, exclude_none=True)
    for k, v in update_data.items():
        setattr(item, k, v)
    db.add(item)
    db.commit()
    db.refresh(item)
    log_admin_action(db, current_user.id, "organization.update", "organization", item.id)
    return item

@router.delete("/organizations/{org_id}", status_code=204)
def delete_organization(org_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["admin"]))):
    item = db.query(Organization).filter(Organization.id == org_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    db.delete(item)
    db.commit()
    log_admin_action(db, current_user.id, "organization.delete", "organization", org_id)
    return


# --- Organization Membership (Admin) ---

@router.get("/organizations/{org_id}/members", response_model=list[OrganizationMemberResponse])
def list_org_members(org_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["admin"]))):
    q = select(
        organization_members.c.org_id,
        organization_members.c.user_id,
        organization_members.c.role,
        organization_members.c.created_at,
        organization_members.c.updated_at,
    ).where(organization_members.c.org_id == org_id)
    rows = db.execute(q).fetchall()
    return [
        OrganizationMemberResponse(
            org_id=r.org_id,
            user_id=r.user_id,
            role=r.role,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in rows
    ]

@router.post("/organizations/{org_id}/members", response_model=OrganizationMemberResponse)
def add_org_member(org_id: uuid.UUID, body: OrganizationMemberCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["admin"]))):
    # Duplication guard
    existing = db.execute(
        select(organization_members).where(
            organization_members.c.org_id == org_id,
            organization_members.c.user_id == body.user_id,
        )
    ).fetchone()
    if existing:
        raise HTTPException(status_code=400, detail="Member already exists")
    db.execute(
        organization_members.insert().values(
            org_id=org_id,
            user_id=body.user_id,
            role=body.role,
        )
    )
    db.commit()
    log_admin_action(db, current_user.id, "organization.member.add", "organization", org_id, details=f"user_id={body.user_id};role={body.role}")
    return OrganizationMemberResponse(org_id=org_id, user_id=body.user_id, role=body.role)

@router.put("/organizations/{org_id}/members/{user_id}", response_model=OrganizationMemberResponse)
def update_org_member(org_id: uuid.UUID, user_id: uuid.UUID, body: OrganizationMemberUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["admin"]))):
    existing = db.execute(
        select(organization_members).where(
            organization_members.c.org_id == org_id,
            organization_members.c.user_id == user_id,
        )
    ).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Member not found")
    db.execute(
        organization_members.update()
        .where(
            organization_members.c.org_id == org_id,
            organization_members.c.user_id == user_id,
        )
        .values(role=body.role)
    )
    db.commit()
    log_admin_action(db, current_user.id, "organization.member.update", "organization", org_id, details=f"user_id={user_id};role={body.role}")
    return OrganizationMemberResponse(org_id=org_id, user_id=user_id, role=body.role)

@router.delete("/organizations/{org_id}/members/{user_id}", status_code=204)
def remove_org_member(org_id: uuid.UUID, user_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["admin"]))):
    db.execute(
        organization_members.delete().where(
            organization_members.c.org_id == org_id,
            organization_members.c.user_id == user_id,
        )
    )
    db.commit()
    log_admin_action(db, current_user.id, "organization.member.remove", "organization", org_id, details=f"user_id={user_id}")
    return
