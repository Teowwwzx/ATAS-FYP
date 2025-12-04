
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, update, delete, insert
from typing import List
import uuid

from app.database.database import get_db
from app.models.organization_model import Organization, OrganizationVisibility, OrganizationType, organization_members, OrganizationRole
from app.schemas.organization_schema import OrganizationResponse, OrganizationCreate, OrganizationUpdate
from app.dependencies import get_current_user, get_current_user_optional, require_roles
from app.models.user_model import User

router = APIRouter()

@router.get("/organizations", response_model=List[OrganizationResponse])
def get_all_organizations(
    db: Session = Depends(get_db),
    q: str | None = Query(None),
    type: OrganizationType | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1),
):
    query = db.query(Organization).filter(Organization.visibility == OrganizationVisibility.public)
    
    if q:
        query = query.filter(Organization.name.ilike(f"%{q}%"))
    
    if type:
        query = query.filter(Organization.type == type)
    
    return (
        query.order_by(Organization.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )


@router.get("/organizations/count")
def count_organizations(
    db: Session = Depends(get_db),
    q: str | None = Query(None),
    type: OrganizationType | None = Query(None),
    include_all_visibility: bool = Query(False),
):
    query = db.query(Organization)
    if not include_all_visibility:
        query = query.filter(Organization.visibility == OrganizationVisibility.public)
    if q:
        query = query.filter(Organization.name.ilike(f"%{q}%"))
    if type:
        query = query.filter(Organization.type == type)
    total = query.with_entities(Organization.id).distinct().count()
    return {"total_count": total}

@router.get("/organizations/{org_id}", response_model=OrganizationResponse)
def get_organization(
    org_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional)
):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
        
    if org.visibility == OrganizationVisibility.private:
        # If private, only allow if user is member or owner (simplification for now: just check if logged in? 
        # or real check. Let's stick to public access check for now or simple owner check)
        if not current_user:
             raise HTTPException(status_code=403, detail="This organization is private")
        # In real app, check membership. For now, let's just check if it exists.
        # Reusing similar logic to events: if private, restricted.
        # For simplicity, assuming we just return it if authenticated, or maybe strict check?
        # Let's enforce strict check later. For now, if private and not owner, 403.
        if org.owner_id != current_user.id:
             raise HTTPException(status_code=403, detail="This organization is private")
             
    return org

@router.post("/organizations", response_model=OrganizationResponse)
def create_organization(
    body: OrganizationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org = Organization(
        **body.dict(),
        owner_id=current_user.id
    )
    db.add(org)
    db.commit()
    db.refresh(org)
    return org

@router.put("/organizations/{org_id}", response_model=OrganizationResponse)
def update_organization(
    org_id: uuid.UUID,
    body: OrganizationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
        
    if org.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this organization")
        
    for key, value in body.dict(exclude_unset=True).items():
        setattr(org, key, value)
        
    db.commit()
    db.refresh(org)
    return org


@router.post("/organizations/{org_id}/members")
def add_member(
    org_id: uuid.UUID,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    try:
        uid = uuid.UUID(payload.get("user_id"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user_id")
    role_name = (payload.get("role") or OrganizationRole.member.value).strip().lower()
    if role_name not in {r.value for r in OrganizationRole}:
        raise HTTPException(status_code=400, detail="Invalid role")
    role_enum = OrganizationRole(role_name)
    existing = db.execute(select(organization_members).where(
        organization_members.c.org_id == org_id,
        organization_members.c.user_id == uid
    )).first()
    if existing is None:
        db.execute(insert(organization_members).values(org_id=org_id, user_id=uid, role=role_enum))
    else:
        db.execute(update(organization_members).where(
            organization_members.c.org_id == org_id,
            organization_members.c.user_id == uid
        ).values(role=role_enum))
    db.commit()
    return {"user_id": str(uid), "role": role_enum.value}


@router.get("/organizations/{org_id}/members")
def list_members(
    org_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    rows = db.execute(select(
        organization_members.c.user_id,
        organization_members.c.role
    ).where(organization_members.c.org_id == org_id)).fetchall()
    return [{"user_id": str(r.user_id), "role": r.role.value if hasattr(r.role, "value") else str(r.role)} for r in rows]


@router.put("/organizations/{org_id}/members/{user_id}")
def update_member(
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    role_name = (payload.get("role") or OrganizationRole.member.value).strip().lower()
    if role_name not in {r.value for r in OrganizationRole}:
        raise HTTPException(status_code=400, detail="Invalid role")
    role_enum = OrganizationRole(role_name)
    db.execute(update(organization_members).where(
        organization_members.c.org_id == org_id,
        organization_members.c.user_id == user_id
    ).values(role=role_enum))
    db.commit()
    return {"user_id": str(user_id), "role": role_enum.value}


@router.delete("/organizations/{org_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    db.execute(delete(organization_members).where(
        organization_members.c.org_id == org_id,
        organization_members.c.user_id == user_id
    ))
    db.commit()
    return

@router.delete("/organizations/{org_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_organization(
    org_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
        
    if org.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this organization")
        
    db.delete(org)
    db.commit()
    return
