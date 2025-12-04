from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
from sqlalchemy.sql import func
from app.database.database import get_db
from app.dependencies import require_roles, get_current_user
from app.models.user_model import User, UserStatus, Role
from app.models.profile_model import Profile
from app.services.user_service import (
    create_user,
    assign_role_to_user,
    remove_role_from_user,
)

router = APIRouter()


@router.get("/me")
def users_me(
    current_user: User = Depends(get_current_user),
):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "roles": [r.name for r in getattr(current_user, "roles", [])],
    }


@router.get("")
def list_users(
    email: str | None = None,
    status: UserStatus | None = None,
    is_verified: bool | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "customer_support"]))
):
    q = db.query(User)
    if email:
        q = q.filter(func.lower(User.email).like(f"%{email.lower()}%"))
    if status is not None:
        q = q.filter(User.status == status)
    if is_verified is not None:
        q = q.filter(User.is_verified == is_verified)
    # Optional name filter via profile
    from sqlalchemy import or_
    if 'name' in locals():
        pass
    
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20
    items = (
        q.order_by(User.created_at.desc() if hasattr(User, "created_at") else User.email.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return [
        {
            "id": str(u.id),
            "email": u.email,
            "is_verified": bool(u.is_verified),
            "status": (u.status.value if isinstance(u.status, UserStatus) else str(u.status)),
            "roles": [r.name for r in getattr(u, "roles", [])],
        }
        for u in items
    ]


@router.get("/search/count")
def count_users(
    email: str | None = None,
    status: UserStatus | None = None,
    is_verified: bool | None = None,
    name: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "customer_support"]))
):
    q = db.query(User)
    if email:
        q = q.filter(func.lower(User.email).like(f"%{email.lower()}%"))
    if status is not None:
        q = q.filter(User.status == status)
    if is_verified is not None:
        q = q.filter(User.is_verified == is_verified)
    if name:
        q = q.join(Profile, Profile.user_id == User.id).filter(func.lower(Profile.full_name).like(f"%{name.lower()}%"))
    total = q.with_entities(User.id).distinct().count()
    return {"total_count": total}


@router.post("/{user_id}/suspend")
def admin_suspend_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    try:
        uid = uuid.UUID(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user_id")
    u = db.query(User).filter(User.id == uid).first()
    if u is None:
        raise HTTPException(status_code=404, detail="User not found")
    u.status = UserStatus.suspended
    db.commit()
    return {"user_id": str(u.id), "status": u.status.value}


@router.post("/{user_id}/activate")
def admin_activate_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    try:
        uid = uuid.UUID(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user_id")
    u = db.query(User).filter(User.id == uid).first()
    if u is None:
        raise HTTPException(status_code=404, detail="User not found")
    u.status = UserStatus.active
    db.commit()
    return {"user_id": str(u.id), "status": u.status.value}


@router.post("/{user_id}/roles/{role_name}")
def admin_assign_role(
    user_id: str,
    role_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    try:
        uid = uuid.UUID(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user_id")
    u = db.query(User).filter(User.id == uid).first()
    if u is None:
        raise HTTPException(status_code=404, detail="User not found")
    assign_role_to_user(db, u, role_name.strip().lower())
    db.commit()
    return {"user_id": str(u.id), "roles": [r.name for r in u.roles]}


@router.delete("/{user_id}/roles/{role_name}")
def admin_remove_role(
    user_id: str,
    role_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    try:
        uid = uuid.UUID(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user_id")
    u = db.query(User).filter(User.id == uid).first()
    if u is None:
        raise HTTPException(status_code=404, detail="User not found")
    remove_role_from_user(db, u, role_name.strip().lower())
    db.commit()
    return {"user_id": str(u.id), "roles": [r.name for r in u.roles]}


@router.post("/{user_id}/expert/verify")
def admin_verify_expert(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    try:
        uid = uuid.UUID(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user_id")
    u = db.query(User).filter(User.id == uid).first()
    if u is None:
        raise HTTPException(status_code=404, detail="User not found")
    assign_role_to_user(db, u, "expert")
    db.commit()
    return {"user_id": str(u.id), "verified_role": "expert"}


@router.delete("/{user_id}/expert/verify")
def admin_revoke_expert(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    try:
        uid = uuid.UUID(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user_id")
    u = db.query(User).filter(User.id == uid).first()
    if u is None:
        raise HTTPException(status_code=404, detail="User not found")
    remove_role_from_user(db, u, "expert")
    db.commit()
    return {"user_id": str(u.id), "revoked_role": "expert"}
