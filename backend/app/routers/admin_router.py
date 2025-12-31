# app/routers/admin_router.py


from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session, joinedload
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
from app.models.event_model import (
    Event,
    EventParticipant,
    EventParticipantRole,
    EventParticipantStatus,
    EventType,
    EventFormat,
    EventVisibility,
    EventStatus,
    EventRegistrationStatus
)
from app.schemas.event_schema import EventUpdate, EventDetails
from app.services.cloudinary_service import upload_file

router = APIRouter()

@router.put("/events/{event_id}", response_model=EventDetails)
def admin_update_event(
    event_id: str,
    body: EventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    try:
        event_uuid = uuid.UUID(event_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")

    event = db.query(Event).filter(Event.id == event_uuid).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Handle ownership transfer
    if body.organizer_id is not None:
        if body.organizer_id != event.organizer_id:
            # Verify new owner exists
            new_owner = db.query(User).filter(User.id == body.organizer_id).first()
            if not new_owner:
                raise HTTPException(status_code=404, detail="New organizer user not found")

            # Update event owner
            event.organizer_id = body.organizer_id

            # Ensure new owner is a participant with 'organizer' role
            new_owner_participant = db.query(EventParticipant).filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == body.organizer_id
            ).first()

            if new_owner_participant:
                new_owner_participant.role = EventParticipantRole.organizer
                new_owner_participant.status = EventParticipantStatus.accepted
            else:
                db.add(EventParticipant(
                    event_id=event.id,
                    user_id=body.organizer_id,
                    role=EventParticipantRole.organizer,
                    status=EventParticipantStatus.accepted,
                    join_method="seed" 
                ))

    # Apply partial updates
    if body.title is not None:
        event.title = body.title
    if body.description is not None:
        event.description = body.description
    if body.logo_url is not None:
        event.logo_url = body.logo_url
    if body.cover_url is not None:
        event.cover_url = body.cover_url
    if body.meeting_url is not None:
        event.meeting_url = body.meeting_url
    if body.format is not None:
        event.format = body.format
        if body.type is None:
            event.type = EventType.online if event.format == EventFormat.webinar else EventType.physical
    if body.type is not None:
        event.type = body.type
    if body.start_datetime is not None:
        event.start_datetime = body.start_datetime
    if body.end_datetime is not None:
        event.end_datetime = body.end_datetime
    if body.registration_type is not None:
        event.registration_type = body.registration_type
    if body.visibility is not None:
        event.visibility = body.visibility
    if body.max_participant is not None:
        event.max_participant = body.max_participant
    if body.venue_place_id is not None:
        event.venue_place_id = body.venue_place_id
    if body.venue_remark is not None:
        event.venue_remark = body.venue_remark
    if body.remark is not None:
        event.remark = body.remark
    if body.price is not None:
        event.price = body.price
    if body.currency is not None:
        event.currency = body.currency

    # Validate dates
    if event.end_datetime <= event.start_datetime:
        raise HTTPException(status_code=400, detail="End datetime must be after start datetime")
        
    db.add(event)
    db.commit()
    db.refresh(event)
    
    # Re-index for search if needed (best effort)
    try:
        from app.services.ai_service import upsert_event_embedding
        src = f"{event.title}\n{event.description or ''}\nformat:{event.format} type:{event.type}"
        upsert_event_embedding(db, event.id, src)
    except Exception:
        pass

    return event

@router.put("/events/{event_id}/publish", response_model=EventDetails)
def admin_publish_event(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
        
    event.status = EventStatus.published
    # default registration to opened on publish if not set
    if getattr(event, "registration_status", None) is None:
        event.registration_status = EventRegistrationStatus.opened
        
    db.add(event)
    db.commit()
    db.refresh(event)
    
    try:
        from app.services.ai_service import upsert_event_embedding
        src = f"{event.title}\n{event.description or ''}\nformat:{event.format} type:{event.type}"
        upsert_event_embedding(db, event.id, src)
    except Exception:
        db.rollback()
        
    log_admin_action(db, current_user.id, "event.publish", "event", event.id)
    return event


@router.put("/events/{event_id}/unpublish", response_model=EventDetails)
def admin_unpublish_event(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
        
    event.status = EventStatus.draft
    db.add(event)
    db.commit()
    db.refresh(event)
    
    log_admin_action(db, current_user.id, "event.unpublish", "event", event.id)
    return event

@router.put("/events/{event_id}/registration/open", response_model=EventDetails)
def admin_open_event_registration(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
        
    event.registration_status = EventRegistrationStatus.opened
    db.add(event)
    db.commit()
    db.refresh(event)
    log_admin_action(db, current_user.id, "event.registration.open", "event", event.id)
    return event

@router.put("/events/{event_id}/registration/close", response_model=EventDetails)
def admin_close_event_registration(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    event.registration_status = EventRegistrationStatus.closed
    db.add(event)
    db.commit()
    db.refresh(event)
    log_admin_action(db, current_user.id, "event.registration.close", "event", event.id)
    return event

@router.put("/events/{event_id}/images/logo", response_model=EventDetails)
def admin_update_event_logo(
    event_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    try:
        event_uuid = uuid.UUID(event_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")

    event = db.query(Event).filter(Event.id == event_uuid).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    url = upload_file(file, "event_logos")
    event.logo_url = url
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.put("/events/{event_id}/images/cover", response_model=EventDetails)
def admin_update_event_cover(
    event_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"])),
):
    try:
        event_uuid = uuid.UUID(event_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")

    event = db.query(Event).filter(Event.id == event_uuid).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    url = upload_file(file, "event_covers")
    event.cover_url = url
    db.add(event)
    db.commit()
    db.refresh(event)
    return event

@router.get("/ping")
def read_admin_root():
    return {"message": "Welcome to the ATAS Admin API!"}

from app.models.organization_model import Organization, OrganizationVisibility, OrganizationType, OrganizationStatus
from app.schemas.organization_schema import OrganizationResponse
from fastapi import Query

@router.get("/organizations", response_model=List[OrganizationResponse])
def admin_list_organizations(
    q: str | None = Query(None),
    type: OrganizationType | None = Query(None),
    status: OrganizationStatus | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    query = db.query(Organization).options(joinedload(Organization.owner).joinedload(User.profile))
    # Admin sees all visibilities by default
    
    # Filter out soft-deleted
    query = query.filter(Organization.deleted_at.is_(None))
    
    if q:
        query = query.filter(Organization.name.ilike(f"%{q}%"))
    if type:
        query = query.filter(Organization.type == type)
    if status:
        query = query.filter(Organization.status == status)

    return (
        query.order_by(Organization.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

@router.get("/organizations/count")
def admin_count_organizations(
    q: str | None = Query(None),
    type: OrganizationType | None = Query(None),
    status: OrganizationStatus | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    query = db.query(Organization)
    query = query.filter(Organization.deleted_at.is_(None))
    if q:
        query = query.filter(Organization.name.ilike(f"%{q}%"))
    if type:
        query = query.filter(Organization.type == type)
    if status:
        query = query.filter(Organization.status == status)
    total = query.with_entities(Organization.id).distinct().count()
    return {"total_count": total}

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
    body: RoleApprovalRequest | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    u = db.query(User).filter(User.id == user_id).first()
    if u is None:
        raise HTTPException(status_code=404, detail="User not found")
    from app.services.user_service import assign_role_to_user, remove_role_from_user
    approved: list[str] = []
    if body and body.role_name:
        final_role = body.role_name.strip().lower()
        pending_role = f"{final_role}_pending"
        assign_role_to_user(db, u, final_role)
        remove_role_from_user(db, u, pending_role)
        approved.append(final_role)
        log_admin_action(db, current_user.id, f"role.approve.{final_role}", "user", u.id)
    else:
        names = [r.name for r in getattr(u, "roles", [])]
        for name in names:
            if isinstance(name, str) and name.endswith("_pending"):
                final_role = name[:-8]
                assign_role_to_user(db, u, final_role)
                remove_role_from_user(db, u, name)
                approved.append(final_role)
                log_admin_action(db, current_user.id, f"role.approve.{final_role}", "user", u.id)
    db.commit()
    return {"user_id": str(u.id), "approved_roles": approved}


class RoleRejectionRequest(BaseModel):
    role_name: str
    reason: str | None = None


@router.post("/users/{user_id}/roles/reject")
def reject_user_role(
    user_id: str,
    body: RoleRejectionRequest | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    u = db.query(User).filter(User.id == user_id).first()
    if u is None:
        raise HTTPException(status_code=404, detail="User not found")
    from app.services.user_service import remove_role_from_user
    rejected: list[str] = []
    if body and body.role_name:
        final_role = body.role_name.strip().lower()
        pending_role = f"{final_role}_pending"
        remove_role_from_user(db, u, pending_role)
        rejected.append(final_role)
        log_admin_action(db, current_user.id, f"role.reject.{final_role}", "user", u.id)
    else:
        names = [r.name for r in getattr(u, "roles", [])]
        for name in names:
            if isinstance(name, str) and name.endswith("_pending"):
                final_role = name[:-8]
                remove_role_from_user(db, u, name)
                rejected.append(final_role)
                log_admin_action(db, current_user.id, f"role.reject.{final_role}", "user", u.id)
    db.commit()
    return {"user_id": str(u.id), "rejected_roles": rejected, "reason": (body.reason if body else None)}


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
@router.get("/pending-roles", response_model=list[str])
def list_pending_roles(db: Session = Depends(get_db), current_user: User = Depends(require_roles(["admin"]))):
    roles = db.query(Role).all()
    names = [r.name for r in roles if isinstance(r.name, str) and r.name.endswith("_pending")]
    # Return unique sorted list
    return sorted(set(names))


# --- Admin Media Upload Endpoints ---

from fastapi import UploadFile, File
from app.services import profile_service, cloudinary_service

@router.put("/users/{user_id}/avatar")
def admin_update_user_avatar(
    user_id: uuid.UUID,
    avatar: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    # Using profile_service.update_avatar logic but for specific user_id
    # profile_service.update_avatar expects owner logic, let's reuse update_profile logic or direct service call
    # Ideally profile_service.update_avatar(db, user_id, avatar) works for any user_id if we pass it
    p = profile_service.update_avatar(db, user_id, avatar)
    if not p:
        # Try creating profile if missing? Or just 404
        raise HTTPException(status_code=404, detail="User profile not found")
    return p

@router.put("/users/{user_id}/cover")
def admin_update_user_cover(
    user_id: uuid.UUID,
    cover: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    p = profile_service.update_cover_picture(db, user_id, cover)
    if not p:
        raise HTTPException(status_code=404, detail="User profile not found")
    return p

@router.put("/organizations/{org_id}/logo")
def admin_update_org_logo(
    org_id: uuid.UUID,
    logo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    url = cloudinary_service.upload_file(logo, "org_logos")
    org.logo_url = url
    db.commit()
    db.refresh(org)
    log_admin_action(db, current_user.id, "organization.update_logo", "organization", org.id)
    return org

@router.put("/organizations/{org_id}/cover")
def admin_update_org_cover(
    org_id: uuid.UUID,
    cover: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    url = cloudinary_service.upload_file(cover, "org_covers")
    org.cover_url = url
    db.commit()
    db.refresh(org)
    log_admin_action(db, current_user.id, "organization.update_cover", "organization", org.id)
    return org
