# app/routers/admin_router.py


from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from typing import List
import app.database.database
from app.database.database import get_db
from app.dependencies import require_roles
from app.models.user_model import User, Role, user_roles
from app.models.audit_log_model import AuditLog
from app.services.audit_service import log_admin_action
from pydantic import BaseModel
import uuid
import json

from app.services.email_service import _wrap_html
from app.models.email_template_model import EmailTemplate as EmailTemplateModel
from app.schemas.email_schema import EmailTemplateCreate, EmailTemplateUpdate
from app.seeders.email_template_seeder import seed_default_email_templates

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


# --- Email Templates (Admin) ---





def _render_template(db: Session, name_or_id: str, variables: dict[str, str]) -> tuple[str, str]:
    q = db.query(EmailTemplateModel).filter(func.lower(EmailTemplateModel.name) == func.lower(name_or_id))
    t = q.first()
    if t is None:
        try:
            tid = uuid.UUID(name_or_id)
            t = db.query(EmailTemplateModel).filter(EmailTemplateModel.id == tid).first()
        except Exception:
            t = None
    if t is None:
        subject = variables.get("subject", "Notification")
        inner_html = variables.get("body_html", "<p>You have a new message.</p>")
    else:
        subject = t.subject
        inner_html = t.body_html
        for k, v in (variables or {}).items():
            inner_html = inner_html.replace(f"{{{{{k}}}}}", v or "")
    html = _wrap_html(subject, inner_html)
    return subject, html


@router.get("/email-templates", response_model=List[dict])
def list_email_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    items = db.query(EmailTemplateModel).order_by(EmailTemplateModel.updated_at.desc().nullslast(), EmailTemplateModel.created_at.desc()).all()
    if not items:
        seed_default_email_templates(db)
        items = db.query(EmailTemplateModel).order_by(EmailTemplateModel.created_at.desc()).all()
    return [
        {
            "id": str(i.id),
            "name": i.name,
            "subject": i.subject,
            "body_html": i.body_html,
            "variables": (json.loads(i.variables) if i.variables else []),
            "created_at": i.created_at.isoformat() if i.created_at else None,
            "updated_at": i.updated_at.isoformat() if i.updated_at else None,
        }
        for i in items
    ]


@router.post("/email-templates", response_model=dict)
def create_email_template(
    body: EmailTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    existing = db.query(EmailTemplateModel).filter(func.lower(EmailTemplateModel.name) == func.lower(body.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Template name already exists")
    item = EmailTemplateModel(
        name=body.name,
        subject=body.subject,
        body_html=body.body_html,
        variables=(json.dumps(body.variables) if body.variables else None),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {
        "id": str(item.id),
        "name": item.name,
        "subject": item.subject,
        "body_html": item.body_html,
        "variables": (json.loads(item.variables) if item.variables else []),
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


@router.put("/email-templates/{template_id}", response_model=dict)
def update_email_template(
    template_id: uuid.UUID,
    body: EmailTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    item = db.query(EmailTemplateModel).filter(EmailTemplateModel.id == template_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Template not found")
    if body.name is not None:
        conflict = (
            db.query(EmailTemplateModel)
            .filter(func.lower(EmailTemplateModel.name) == func.lower(body.name), EmailTemplateModel.id != template_id)
            .first()
        )
        if conflict:
            raise HTTPException(status_code=400, detail="Template name already exists")
        item.name = body.name
    if body.subject is not None:
        item.subject = body.subject
    if body.body_html is not None:
        item.body_html = body.body_html
    if body.variables is not None:
        item.variables = json.dumps(body.variables) if body.variables else None
    db.add(item)
    db.commit()
    db.refresh(item)
    return {
        "id": str(item.id),
        "name": item.name,
        "subject": item.subject,
        "body_html": item.body_html,
        "variables": (json.loads(item.variables) if item.variables else []),
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


@router.get("/email-templates/{template_id}", response_model=dict)
def get_email_template(
    template_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    item = db.query(EmailTemplateModel).filter(EmailTemplateModel.id == template_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Template not found")
    return {
        "id": str(item.id),
        "name": item.name,
        "subject": item.subject,
        "body_html": item.body_html,
        "variables": (json.loads(item.variables) if item.variables else []),
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


@router.delete("/email-templates/{template_id}")
def delete_email_template(
    template_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    item = db.query(EmailTemplateModel).filter(EmailTemplateModel.id == template_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(item)
    db.commit()
    return {"message": "ok"}


class EmailTemplateBroadcastRequest(BaseModel):
    template_id: str | None = None
    template_name: str | None = None
    variables: dict[str, str] | None = None
    target_role: str | None = None
    target_user_id: uuid.UUID | None = None


@router.post("/email-templates/broadcast")
def broadcast_email_template(
    body: EmailTemplateBroadcastRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    name = (body.template_name or body.template_id or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="template_name or template_id required")

    query = db.query(User)
    if body.target_user_id:
        query = query.filter(User.id == body.target_user_id)
    elif body.target_role:
        query = (
            query
            .join(user_roles, user_roles.c.user_id == User.id)
            .join(Role, Role.id == user_roles.c.role_id)
            .filter(func.lower(Role.name) == func.lower(body.target_role))
        )

    users = query.all()
    subject, html = _render_template(db, name, body.variables or {})

    # Try sending emails (best-effort)
    import resend
    from app.core.config import settings
    resend.api_key = settings.RESEND_API_KEY
    sent = 0
    for u in users:
        if not u.email:
            continue
        params = {"from": settings.SENDER_EMAIL, "to": [u.email], "subject": subject, "html": html}
        try:
            resend.Emails.send(params)
            sent += 1
        except Exception:
            # Silent fail per user; continue
            pass

    details_json = json.dumps({
        "template_name": name,
        "variables": body.variables or {},
        "target_role": body.target_role,
        "target_user_id": str(body.target_user_id) if body.target_user_id else None,
        "recipient_count": sent,
    })
    log_admin_action(db, current_user.id, "broadcast_email_template", "system", current_user.id, details_json)
    return {"count": sent}


class EmailTemplateTestSendRequest(BaseModel):
    to_email: str
    variables: dict[str, str] | None = None


@router.post("/email-templates/{template_id}/test-send")
def test_send_email_template(
    template_id: str,
    body: EmailTemplateTestSendRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    if not body.to_email:
        raise HTTPException(status_code=400, detail="to_email required")
    subject, html = _render_template(db, template_id, body.variables or {})
    import resend
    from app.core.config import settings
    resend.api_key = settings.RESEND_API_KEY
    params = {"from": settings.SENDER_EMAIL, "to": [body.to_email], "subject": f"[Test] {subject}", "html": html}
    try:
        resend.Emails.send(params)
        log_admin_action(db, current_user.id, "email_template.test_send", "user", current_user.id, json.dumps({"template_id": template_id, "to_email": body.to_email}))
        return {"message": "ok"}
    except Exception:
        # Still return ok to match frontend fallback behavior
        return {"message": "ok"}
