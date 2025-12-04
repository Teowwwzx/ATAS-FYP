# app/routers/admin_router.py


from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database.database import get_db
from app.dependencies import require_roles
from app.models.user_model import User, Role
from app.models.audit_log_model import AuditLog
from app.services.audit_service import log_admin_action
from pydantic import BaseModel

router = APIRouter()

@router.get("/ping")
def read_admin_root():
    return {"message": "Welcome to the ATAS Admin API!"}

@router.get("/audit-logs", response_model=List[dict])
def list_audit_logs(
    action: str | None = None,
    actor_user_id: str | None = None,
    target_type: str | None = None,
    target_id: str | None = None,
    start_after: __import__("datetime").datetime | None = None,
    end_before: __import__("datetime").datetime | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    q = db.query(AuditLog)
    if action:
        q = q.filter(AuditLog.action == action)
    if actor_user_id:
        q = q.filter(AuditLog.user_id == actor_user_id)
    if target_type:
        q = q.filter(AuditLog.target_type == target_type)
    if target_id:
        q = q.filter(AuditLog.target_id == target_id)
    if start_after is not None:
        q = q.filter(AuditLog.created_at >= start_after)
    if end_before is not None:
        q = q.filter(AuditLog.created_at <= end_before)
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20
    items = (
        q.order_by(AuditLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return [
        {
            "id": str(i.id),
            "actor_user_id": str(i.user_id) if i.user_id else None,
            "action": i.action,
            "target_type": i.target_type,
            "target_id": str(i.target_id) if i.target_id else None,
            "details": i.details,
            "created_at": i.created_at.isoformat() if i.created_at else None,
        }
        for i in items
    ]

@router.get("/audit-logs/count")
def count_audit_logs(
    action: str | None = None,
    actor_user_id: str | None = None,
    target_type: str | None = None,
    target_id: str | None = None,
    start_after: __import__("datetime").datetime | None = None,
    end_before: __import__("datetime").datetime | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    q = db.query(AuditLog)
    if action:
        q = q.filter(AuditLog.action == action)
    if actor_user_id:
        q = q.filter(AuditLog.user_id == actor_user_id)
    if target_type:
        q = q.filter(AuditLog.target_type == target_type)
    if target_id:
        q = q.filter(AuditLog.target_id == target_id)
    if start_after is not None:
        q = q.filter(AuditLog.created_at >= start_after)
    if end_before is not None:
        q = q.filter(AuditLog.created_at <= end_before)
    total = q.with_entities(AuditLog.id).distinct().count()
    return {"total_count": total}


class RoleApprovalRequest(BaseModel):
    role_name: str


@router.post("/users/{user_id}/roles/approve")
def approve_user_role(
    user_id: str,
    body: RoleApprovalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    u = db.query(User).filter(User.id == user_id).first()
    if u is None:
        raise HTTPException(status_code=404, detail="User not found")
    final_role = body.role_name.strip().lower()
    pending_role = f"{final_role}_pending"
    from app.services.user_service import assign_role_to_user, remove_role_from_user
    assign_role_to_user(db, u, final_role)
    remove_role_from_user(db, u, pending_role)
    log_admin_action(db, current_user.id, f"role.approve.{final_role}", "user", u.id)
    return {"user_id": str(u.id), "approved_role": final_role}


class RoleRejectionRequest(BaseModel):
    role_name: str
    reason: str | None = None


@router.post("/users/{user_id}/roles/reject")
def reject_user_role(
    user_id: str,
    body: RoleRejectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    u = db.query(User).filter(User.id == user_id).first()
    if u is None:
        raise HTTPException(status_code=404, detail="User not found")
    final_role = body.role_name.strip().lower()
    pending_role = f"{final_role}_pending"
    from app.services.user_service import remove_role_from_user
    remove_role_from_user(db, u, pending_role)
    log_admin_action(db, current_user.id, f"role.reject.{final_role}", "user", u.id)
    return {"user_id": str(u.id), "rejected_role": final_role, "reason": body.reason}
