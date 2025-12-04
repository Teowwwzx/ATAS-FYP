from fastapi import APIRouter, Depends, HTTPException
import uuid
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from app.database.database import get_db
from app.models.user_model import User, UserStatus, Role
from app.schemas.user_schema import UserCreate, UserResponse, UserMeResponse, UserUpdateAdmin
from app.services.user_service import create_user, assign_role_to_user, remove_role_from_user
from app.services.audit_service import log_admin_action
from app.dependencies import get_current_user, require_roles
from typing import List

router = APIRouter()

@router.get("/me", response_model=UserMeResponse)
def get_me(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    roles = (
        db.query(Role)
        .join(Role.users)
        .filter(User.id == current_user.id)
        .all()
    )
    role_names = [r.name for r in roles]
    return UserMeResponse(id=current_user.id, email=current_user.email, roles=role_names)

@router.get("", response_model=List[UserResponse])
def list_users(
    email: str | None = None,
    name: str | None = None,
    status: str | None = None,
    role: str | None = None,
    is_verified: bool | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    q = db.query(User)
    if email:
        q = q.filter(User.email.ilike(f"%{email}%"))
    if is_verified is not None:
        q = q.filter(User.is_verified == is_verified)
    if status is not None:
        try:
            q = q.filter(User.status == UserStatus(status))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid status")
    if role:
        from app.models.user_model import user_roles, Role
        q = q.join(user_roles, user_roles.c.user_id == User.id)
        q = q.join(Role, Role.id == user_roles.c.role_id)
        q = q.filter(func.lower(Role.name) == func.lower(role))
    if name:
        from app.models.profile_model import Profile
        q = q.join(Profile, Profile.user_id == User.id)
        q = q.filter(Profile.full_name.ilike(f"%{name}%"))
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20
    items = (
        q.order_by(User.email.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return items

@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["admin"]))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.post("/bulk/status")
def bulk_update_status(
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    ids = body.get("user_ids") or []
    status = body.get("status")
    try:
        new_status = UserStatus(status)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid status")
    updated = 0
    users = db.query(User).filter(User.id.in_(ids)).all()
    for u in users:
        u.status = new_status
        updated += 1
    db.commit()
    for u in users:
        log_admin_action(db, current_user.id, "user.bulk.status", "user", u.id, details=f"status={new_status.value}")
    return {"updated": updated}

@router.get("/search/count")
def count_users(
    email: str | None = None,
    name: str | None = None,
    status: str | None = None,
    role: str | None = None,
    is_verified: bool | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    q = db.query(User)
    if email:
        q = q.filter(User.email.ilike(f"%{email}%"))
    if is_verified is not None:
        q = q.filter(User.is_verified == is_verified)
    if status is not None:
        try:
            q = q.filter(User.status == UserStatus(status))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid status")
    if role:
        from app.models.user_model import user_roles, Role
        q = q.join(user_roles, user_roles.c.user_id == User.id)
        q = q.join(Role, Role.id == user_roles.c.role_id)
        q = q.filter(func.lower(Role.name) == func.lower(role))
    if name:
        from app.models.profile_model import Profile
        q = q.join(Profile, Profile.user_id == User.id)
        q = q.filter(Profile.full_name.ilike(f"%{name}%"))
    total = q.with_entities(User.id).distinct().count()
    return {"total_count": total}

@router.put("/{user_id}", response_model=UserResponse)
def update_user_admin(
    user_id: uuid.UUID,
    body: UserUpdateAdmin,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if body.email is not None:
        user.email = body.email
    if body.is_verified is not None:
        user.is_verified = body.is_verified
    if body.status is not None:
        user.status = body.status
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/{user_id}/suspend", response_model=UserResponse)
def suspend_user(user_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["admin"]))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.status = UserStatus.suspended
    db.commit()
    db.refresh(user)
    log_admin_action(db, current_user.id, "user.suspend", "user", user.id)
    return user

@router.post("/{user_id}/activate", response_model=UserResponse)
def activate_user(user_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["admin"]))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.status = UserStatus.active
    db.commit()
    db.refresh(user)
    log_admin_action(db, current_user.id, "user.activate", "user", user.id)
    return user

@router.post("/{user_id}/expert/verify", response_model=UserResponse)
def verify_expert(user_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["admin"]))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    assign_role_to_user(db, user, "expert")
    from app.services.user_service import remove_role_from_user as _remove
    _remove(db, user, "expert_pending")
    from app.models.notification_model import Notification, NotificationType
    db.add(Notification(
        recipient_id=user.id,
        actor_id=current_user.id,
        type=NotificationType.system,
        content="Your expert verification has been approved",
        link_url=f"/profiles/{user.id}"
    ))
    db.commit()
    log_admin_action(db, current_user.id, "user.role.expert.verify", "user", user.id)
    return user

@router.delete("/{user_id}/expert/verify", response_model=UserResponse)
def revoke_expert(user_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["admin"]))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    remove_role_from_user(db, user, "expert")
    log_admin_action(db, current_user.id, "user.role.expert.revoke", "user", user.id)
    return user

@router.post("/{user_id}/roles/{role_name}", response_model=UserResponse)
def assign_role_generic(user_id: uuid.UUID, role_name: str, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["admin"]))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    role = db.query(Role).filter(Role.name == role_name).first()
    if role is None:
        role = Role(name=role_name)
        db.add(role)
        db.commit()
        db.refresh(role)
    if role not in user.roles:
        user.roles.append(role)
        db.commit()
        db.refresh(user)
    log_admin_action(db, current_user.id, "user.role.assign", "user", user.id, details=role_name)
    return user

@router.delete("/{user_id}/roles/{role_name}", response_model=UserResponse)
def remove_role_generic(user_id: uuid.UUID, role_name: str, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["admin"]))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    role = db.query(Role).filter(Role.name == role_name).first()
    if role and role in user.roles:
        user.roles.remove(role)
        db.commit()
        db.refresh(user)
    log_admin_action(db, current_user.id, "user.role.remove", "user", user.id, details=role_name)
    return user
