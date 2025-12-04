from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile, Request
from fastapi.responses import Response
import uuid
import base64
import hmac
import hashlib
import io
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from app.database.database import get_db
from app.models.event_model import (
    Event,
    EventFormat,
    EventCategory,
    Category,
    EventRegistrationType,
    EventParticipant,
    EventParticipantRole,
    EventParticipantStatus,
    EventVisibility,
    EventStatus,
    EventRegistrationStatus,
    EventType,
    EventProposal,
    EventProposalComment,
)
from app.models.notification_model import Notification, NotificationType
from app.services.email_service import (
    send_event_invitation_email,
    send_event_role_update_email,
    send_event_removed_email,
    send_event_joined_email,
    send_event_reminder_email,
    send_event_proposal_comment_email,
)
from app.schemas.event_schema import (
    EventDetails,
    EventCreate,
    EventUpdate,
    EventParticipantDetails,
    EventParticipantCreate,
    EventParticipantResponseUpdate,
    EventParticipantBulkCreate,
    EventParticipantRoleUpdate,
    CategoryCreate,
    CategoryResponse,
    EventCategoryAttach,
    AttendanceQRResponse,
    AttendanceScanRequest,
    AttendanceUserScanRequest,
    WalkInAttendanceRequest,
    EventReminderCreate,
    EventReminderResponse,
    MyEventItem,
    EventAttendanceStats,
    EventChecklistItemCreate,
    EventChecklistItemUpdate,
    EventChecklistItemResponse,
    EventProposalCreate,
    EventProposalResponse,
    EventProposalCommentCreate,
    EventProposalCommentResponse,
    EventProposalUpdate,
    EventProposalCommentUpdate,
)
from typing import List
from app.dependencies import get_current_user, get_current_user_optional
from app.dependencies import require_roles
from app.models.user_model import User, Role, user_roles
from app.models.event_model import EventReminder
from app.models.event_model import EventChecklistItem
from app.core.config import settings
from app.services.cloudinary_service import upload_file
from app.services.user_service import create_user
from app.schemas.user_schema import UserCreate
from app.models.profile_model import Profile
import os
from app.services.audit_service import log_admin_action

router = APIRouter()

DEFAULT_APU_PLACE_ID = "ChIJr7mC9fN5zDERSrD1wGg7oYQ"  # Asia Pacific University (placeholder); replace with actual Google Place ID in .env if needed

def _parse_role(value: str) -> EventParticipantRole:
    s = (value or "").strip().lower()
    aliases = {
        "commitee": "committee",
        "audiences": "audience",
        "speakers": "speaker",
        "sponsors": "sponsor",
        "students": "student",
        "teachers": "teacher",
        "organisers": "organizer",
        "organiser": "organizer",
    }
    s = aliases.get(s, s)
    return EventParticipantRole(s)

def _make_user_attendance_token(event_id: uuid.UUID, user_id: uuid.UUID, minutes_valid: int = 15) -> tuple[str, datetime]:
    exp = datetime.utcnow() + timedelta(minutes=minutes_valid)
    payload = f"{event_id}|{user_id}|{int(exp.timestamp())}"
    signature = hmac.new(settings.SECRET_KEY.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).digest()
    token = f"{base64.urlsafe_b64encode(payload.encode('utf-8')).decode('utf-8').rstrip('=')}.{base64.urlsafe_b64encode(signature).decode('utf-8').rstrip('=')}"
    return token, exp

def _verify_user_attendance_token(token: str) -> tuple[uuid.UUID, uuid.UUID]:
    def _pad(s: str) -> str:
        return s + "=" * ((4 - len(s) % 4) % 4)
    payload_b64, sig_b64 = token.split(".")
    payload_raw = base64.urlsafe_b64decode(_pad(payload_b64)).decode("utf-8")
    sig = base64.urlsafe_b64decode(_pad(sig_b64))
    expected_sig = hmac.new(settings.SECRET_KEY.encode("utf-8"), payload_raw.encode("utf-8"), hashlib.sha256).digest()
    if not hmac.compare_digest(sig, expected_sig):
        raise HTTPException(status_code=400, detail="Invalid token signature")
    event_id_str, user_id_str, exp_ts_str = payload_raw.split("|")
    exp_ts = int(exp_ts_str)
    if int(datetime.utcnow().timestamp()) > exp_ts:
        raise HTTPException(status_code=400, detail="Token expired")
    return uuid.UUID(event_id_str), uuid.UUID(user_id_str)

@router.get("/events/count", response_model=dict)
def count_events(
    q_text: str | None = Query(None),
    status: EventStatus | None = Query(None),
    type: EventType | None = Query(None),
    organizer_id: uuid.UUID | None = Query(None),
    visibility: EventVisibility | None = Query(None),
    upcoming: bool = Query(False),
    include_all_visibility: bool = Query(False),
    db: Session = Depends(get_db),
):
    query = db.query(Event)
    query = query.filter(Event.deleted_at.is_(None))

    if not include_all_visibility:
        if visibility is None:
            query = query.filter(Event.visibility == EventVisibility.public)
        else:
            query = query.filter(Event.visibility == visibility)
    elif visibility is not None:
        query = query.filter(Event.visibility == visibility)

    if upcoming:
        query = query.filter(Event.start_datetime >= func.now())
    if q_text:
        query = query.filter(
            or_(
                Event.title.ilike(f"%{q_text}%"),
                Event.description.ilike(f"%{q_text}%"),
                Event.location.ilike(f"%{q_text}%"),
            )
        )
    if status:
        query = query.filter(Event.status == status)
    if type:
        query = query.filter(Event.type == type)
    if organizer_id:
        query = query.filter(Event.organizer_id == organizer_id)

    return {"total_count": query.count()}

@router.get("/events", response_model=List[EventDetails])
def get_all_events(
    db: Session = Depends(get_db),
    category_id: uuid.UUID | None = Query(None),
    category_name: str | None = Query(None),
    upcoming: bool | None = Query(None),
    q_text: str | None = Query(None),
    type: EventType | None = Query(None),
    format: EventFormat | None = Query(None),
    visibility: EventVisibility | None = Query(None),
    registration_type: EventRegistrationType | None = Query(None),
    registration_status: EventRegistrationStatus | None = Query(None),
    organizer_id: uuid.UUID | None = Query(None),
    start_after: datetime | None = Query(None),
    end_before: datetime | None = Query(None),
    page: int = 1,
    page_size: int = 20,
    include_all_visibility: bool = False, # New param
):
    query = db.query(Event)
    # Exclude soft-deleted events
    query = query.filter(Event.deleted_at.is_(None))
    
    if not include_all_visibility:
        if visibility is None:
            query = query.filter(Event.visibility == EventVisibility.public)
        else:
            query = query.filter(Event.visibility == visibility)
    # If include_all_visibility is True, we skip the visibility filter (unless specific visibility is requested? No, let's say it overrides default)
    # But if visibility IS provided, we should probably respect it?
    # Let's say: if include_all_visibility is True, we IGNORE the default "public only".
    # If visibility param IS provided, we still filter by it.
    if include_all_visibility:
        if visibility is not None:
             query = query.filter(Event.visibility == visibility)
    
    if upcoming:
        query = query.filter(Event.start_datetime >= func.now())
    if q_text:
        query = query.filter(Event.title.ilike(f"%{q_text}%"))
    if type is not None:
        query = query.filter(Event.type == type)
    if format is not None:
        query = query.filter(Event.format == format)
    if registration_type is not None:
        query = query.filter(Event.registration_type == registration_type)
    if registration_status is not None:
        query = query.filter(Event.registration_status == registration_status)
    if organizer_id is not None:
        query = query.filter(Event.organizer_id == organizer_id)
    if start_after is not None:
        query = query.filter(Event.start_datetime >= start_after)
    if end_before is not None:
        query = query.filter(Event.end_datetime <= end_before)
    if category_id is not None:
        query = (
            query.join(EventCategory, EventCategory.event_id == Event.id)
            .filter(EventCategory.category_id == category_id)
            .distinct()
        )
    elif category_name is not None:
        query = (
            query.join(EventCategory, EventCategory.event_id == Event.id)
            .join(Category, Category.id == EventCategory.category_id)
            .filter(func.lower(Category.name) == func.lower(category_name))
            .distinct()
        )
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20
    events = (
        query.order_by(Event.start_datetime.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return events



@router.get("/events/me/history", response_model=List[EventDetails])
def get_my_event_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    role_filter: str | None = Query(
        None,
        description="Filter by your involvement: organized | participant | speaker | sponsor",
    ),
):
    """List past events the current user has involvement in.

    Default: only events the user attended (status = attended).
    Filters:
    - organized: events you organized (past)
    - participant: events you attended as audience/student/teacher/committee
    - speaker: events you attended as speaker
    - sponsor: events you attended as sponsor
    """

    allowed_filters = {"organized", "participant", "speaker", "sponsor"}
    if role_filter is not None and role_filter not in allowed_filters:
        raise HTTPException(status_code=400, detail="Invalid role_filter")

    query = db.query(Event)

    # Always past events for history
    query = query.filter(Event.end_datetime < func.now())

    if role_filter == "organized":
        query = query.filter(Event.organizer_id == current_user.id)
    else:
        # participant-related filters require join
        query = query.join(EventParticipant, EventParticipant.event_id == Event.id)
        query = query.filter(
            EventParticipant.user_id == current_user.id,
            EventParticipant.status == EventParticipantStatus.attended,
        )

        if role_filter == "speaker":
            query = query.filter(EventParticipant.role == EventParticipantRole.speaker)
        elif role_filter == "sponsor":
            query = query.filter(EventParticipant.role == EventParticipantRole.sponsor)
        elif role_filter == "participant":
            query = query.filter(
                EventParticipant.role.in_(
                    [
                        EventParticipantRole.audience,
                        EventParticipantRole.student,
                        EventParticipantRole.teacher,
                        EventParticipantRole.committee,
                    ]
                )
            )
        else:
            # No role_filter provided: include any attended role
            pass

    events = (
        query.order_by(Event.end_datetime.desc()).distinct().all()
    )
    return events


@router.post("/events", response_model=EventDetails)
def create_event(
    event: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new event and assign the creator as organizer participant.

    Validation:
    - title must not be empty
    - end_datetime must be after start_datetime
    - max_participant must be positive when provided
    """
    # Basic validations
    if not event.title or not event.title.strip():
        raise HTTPException(status_code=400, detail="Title is required")
    sd = event.start_datetime
    ed = event.end_datetime
    if sd.tzinfo is None:
        sd = sd.replace(tzinfo=timezone.utc)
    if ed.tzinfo is None:
        ed = ed.replace(tzinfo=timezone.utc)
    if ed <= sd:
        raise HTTPException(status_code=400, detail="End datetime must be after start datetime")
    
    if event.max_participant is not None and event.max_participant <= 0:
        raise HTTPException(status_code=400, detail="max_participant must be a positive integer")
    # Derive default type from format if not provided
    derived_type = event.type
    if derived_type is None:
        if event.format == EventFormat.webinar or getattr(event.format, 'value', None) == "webinar":
            derived_type = EventType.online
        else:
            # Most non-webinar formats are offline by default
            derived_type = EventType.offline

    # Default venue to APU if not provided
    venue_place_id = event.venue_place_id if event.venue_place_id else DEFAULT_APU_PLACE_ID

    db_event = Event(
        organizer_id=current_user.id,
        title=event.title,
        description=event.description,
        logo_url=event.logo_url,
        cover_url=event.cover_url,
        format=event.format,
        type=derived_type,
        start_datetime=sd,
        end_datetime=ed,
        registration_type=event.registration_type,
        visibility=event.visibility,
        max_participant=event.max_participant,
        venue_place_id=venue_place_id,
        venue_remark=event.venue_remark,
        remark=event.remark,
    )

    db.add(db_event)
    # Flush to get event ID without committing, keeping operation atomic
    db.flush()

    # Assign organizer participant (duplication guard)
    existing_link = (
        db.query(EventParticipant)
        .filter(EventParticipant.event_id == db_event.id, EventParticipant.user_id == current_user.id)
        .first()
    )
    if existing_link is None:
        organizer_participant = EventParticipant(
            event_id=db_event.id,
            user_id=current_user.id,
            role=EventParticipantRole.organizer,
            status=EventParticipantStatus.accepted,
            description=None,
        )
        db.add(organizer_participant)

    # Single commit to ensure event and organizer participant are persisted together
    db.commit()
    db.refresh(db_event)

    return db_event


# --- Publish/Unpublish & Registration Management ---

@router.put("/events/{event_id}/publish", response_model=EventDetails)
def publish_event(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.organizer_id != current_user.id and not any(r in current_user.roles for r in ["admin", "content_moderator"]):
        raise HTTPException(status_code=403, detail="Only organizer or admin/moderator can publish the event")
    event.status = EventStatus.published
    # default registration to opened on publish if not set
    if getattr(event, "registration_status", None) is None:
        event.registration_status = EventRegistrationStatus.opened
    db.add(event)
    db.commit()
    db.refresh(event)
    log_admin_action(db, current_user.id, "event.publish", "event", event.id)
    return event


@router.put("/events/{event_id}/unpublish", response_model=EventDetails)
def unpublish_event(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.organizer_id != current_user.id and not any(r in current_user.roles for r in ["admin", "content_moderator"]):
        raise HTTPException(status_code=403, detail="Only organizer or admin/moderator can unpublish the event")
    event.status = EventStatus.draft
    db.add(event)
    db.commit()
    db.refresh(event)
    log_admin_action(db, current_user.id, "event.unpublish", "event", event.id)
    return event


@router.put("/events/{event_id}/registration/open", response_model=EventDetails)
def open_event_registration(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only organizer can manage registration")
    event.registration_status = EventRegistrationStatus.opened
    db.add(event)
    db.commit()
    db.refresh(event)
    log_admin_action(db, current_user.id, "event.registration.open", "event", event.id)
    return event


@router.put("/events/{event_id}/registration/close", response_model=EventDetails)
def close_event_registration(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only organizer can manage registration")
    event.registration_status = EventRegistrationStatus.closed
    db.add(event)
    db.commit()
    db.refresh(event)
    log_admin_action(db, current_user.id, "event.registration.close", "event", event.id)
    return event


# --- Category Management ---

@router.get("/categories", response_model=List[CategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    categories = db.query(Category).order_by(Category.name.asc()).all()
    return categories


@router.post("/categories", response_model=CategoryResponse)
def create_category(
    body: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Case-insensitive uniqueness check
    existing = (
        db.query(Category)
        .filter(func.lower(Category.name) == func.lower(body.name))
        .first()
    )
    if existing is not None:
        raise HTTPException(status_code=400, detail="Category already exists")

    category = Category(name=body.name)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.get("/events/mine", response_model=list[MyEventItem])
def list_my_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List events for the current user (organizer or participant), with your role."""
    # Events organized by me
    organized = db.query(Event).filter(Event.organizer_id == current_user.id).all()

    # Events I'm participating in (exclude duplicates)
    participation_links = (
        db.query(EventParticipant)
        .filter(EventParticipant.user_id == current_user.id)
        .all()
    )
    event_map: dict[uuid.UUID, MyEventItem] = {}

    for e in organized:
        event_map[e.id] = MyEventItem(
            event_id=e.id,
            title=e.title,
            start_datetime=e.start_datetime,
            end_datetime=e.end_datetime,
            type=e.type,
            status=e.status,
            my_role=EventParticipantRole.organizer,
            cover_url=e.cover_url,
            venue_remark=e.venue_remark,
            format=e.format,
        )

    for link in participation_links:
        e = db.query(Event).filter(Event.id == link.event_id).first()
        if e is None:
            continue
        existing = event_map.get(e.id)
        # Preserve organizer role if already set; otherwise set from participation link
        if existing is None or existing.my_role != EventParticipantRole.organizer:
            event_map[e.id] = MyEventItem(
                event_id=e.id,
                title=e.title,
                start_datetime=e.start_datetime,
                end_datetime=e.end_datetime,
                type=e.type,
                status=e.status,
                my_role=link.role,
                cover_url=e.cover_url,
                venue_remark=e.venue_remark,
                format=e.format,
            )

    return list(event_map.values())


@router.get("/events/{event_id}", response_model=EventDetails)
def get_event_details(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    event = db.query(Event).filter(Event.id == event_id, Event.deleted_at.is_(None)).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.visibility == EventVisibility.public:
        return event

    # Private event: allow organizer, admin, or any participant to view
    if current_user is not None:
        if "admin" in current_user.roles:
            return event
        if event.organizer_id == current_user.id:
            return event
        participant = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        if participant is not None:
            return event

    raise HTTPException(status_code=403, detail="This event is private")


@router.get("/events/{event_id}/participants", response_model=List[EventParticipantDetails])
def list_event_participants(
    event_id: uuid.UUID,
    role: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.visibility == EventVisibility.private:
        if current_user is None:
            raise HTTPException(status_code=403, detail="This event is private")
        if event.organizer_id != current_user.id:
            participant = (
                db.query(EventParticipant)
                .filter(
                    EventParticipant.event_id == event.id,
                    EventParticipant.user_id == current_user.id,
                )
                .first()
            )
            if participant is None:
                raise HTTPException(status_code=403, detail="This event is private")

    q = db.query(EventParticipant).filter(EventParticipant.event_id == event.id)
    if role is not None:
        try:
            role_enum = EventParticipantRole(role)
            q = q.filter(EventParticipant.role == role_enum)
        except ValueError:
            return []
    participants = q.all()
    return participants


@router.post("/events/{event_id}/join", response_model=EventParticipantDetails)
def join_public_event(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Allow a signed-in user to join a public event while registration is opened.
    - Prevent duplicate joins
    - Respect max_participant capacity (counts accepted)
    - Auto-accept to `accepted` if event.auto_accept_registration and capacity available, else `pending`
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.visibility != EventVisibility.public:
        raise HTTPException(status_code=403, detail="This event is not public")

    if event.status != EventStatus.published:
        raise HTTPException(status_code=400, detail="Event is not published")

    # Require registration to be opened
    try:
        from app.models.event_model import EventRegistrationStatus
    except Exception:
        EventRegistrationStatus = None
    if EventRegistrationStatus is not None:
        if getattr(event, "registration_status", None) != EventRegistrationStatus.opened:
            raise HTTPException(status_code=400, detail="Registration is closed")

    # Allow joining during event window as long as registration is opened

    # Already a participant?
    existing = (
        db.query(EventParticipant)
        .filter(
            EventParticipant.event_id == event.id,
            EventParticipant.user_id == current_user.id,
        )
        .first()
    )
    if existing is not None:
        return existing

    # Capacity check counts accepted participants
    if event.max_participant is not None:
        accepted_count = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.status == EventParticipantStatus.accepted,
            )
            .count()
        )
        # If auto-accept is enabled and accepting would exceed capacity, reject
        if event.auto_accept_registration and accepted_count >= event.max_participant:
            raise HTTPException(status_code=400, detail="Event is full")

    # Determine initial status based on auto_accept_registration and capacity
    initial_status = EventParticipantStatus.accepted
    if event.max_participant is not None:
        if not event.auto_accept_registration:
            initial_status = EventParticipantStatus.pending
        else:
            # double-check capacity when auto-accept enabled
            if accepted_count >= event.max_participant:
                initial_status = EventParticipantStatus.pending

    participant = EventParticipant(
        event_id=event.id,
        user_id=current_user.id,
        role=EventParticipantRole.audience,
        description=None,
        join_method="pre_registered",
        status=initial_status,
    )
    db.add(participant)

    # Notify organizer that someone joined
    notif = Notification(
        recipient_id=event.organizer_id,
        actor_id=current_user.id,
        type=NotificationType.event,
        content=f"A participant joined your event '{event.title}'",
        link_url=f"/main/events/{event.id}",
    )
    db.add(notif)

    db.commit()
    db.refresh(participant)
    # Email confirmation best-effort to the participant
    if current_user.email:
        try:
            send_event_joined_email(email=current_user.email, event=event)
        except Exception:
            pass
    return participant


@router.delete("/events/{event_id}/participants/me", status_code=204)
def leave_event(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Allow a participant to quit an event. Organizer cannot leave their own event.
    Deleting the participation allows re-joining later if still open.
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    participant = (
        db.query(EventParticipant)
        .filter(EventParticipant.event_id == event.id, EventParticipant.user_id == current_user.id)
        .first()
    )
    if participant is None:
        raise HTTPException(status_code=404, detail="You are not a participant of this event")

    if participant.role == EventParticipantRole.organizer:
        raise HTTPException(status_code=403, detail="Organizer cannot leave their own event")

    # Delete participation record
    db.delete(participant)

    # Notify organizer
    notif = Notification(
        recipient_id=event.organizer_id,
        actor_id=current_user.id,
        type=NotificationType.event,
        content=f"A participant left your event '{event.title}'",
        link_url=f"/main/events/{event.id}",
    )
    db.add(notif)
    db.commit()
    return Response(status_code=204)


@router.post("/events/{event_id}/participants", response_model=EventParticipantDetails)
def invite_event_participant(
    event_id: uuid.UUID,
    body: EventParticipantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Only organizer or committee can invite
    if event.organizer_id != current_user.id:
        my_participation = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        if my_participation is None or my_participation.role != EventParticipantRole.committee:
            raise HTTPException(status_code=403, detail="Not allowed to invite participants")

    try:
        role_enum = _parse_role(body.role)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid participant role")
    if role_enum == EventParticipantRole.organizer:
        raise HTTPException(status_code=400, detail="Cannot invite organizer; event already has one")

    existing = (
        db.query(EventParticipant)
        .filter(
            EventParticipant.event_id == event.id,
            EventParticipant.user_id == body.user_id,
        )
        .first()
    )
    if existing is not None:
        if existing.role != role_enum:
            existing.role = role_enum
            if body.description is not None:
                existing.description = body.description
            db.add(existing)
            notif = Notification(
                recipient_id=body.user_id,
                actor_id=current_user.id,
                type=NotificationType.event,
                content=f"Your role for '{event.title}' has been updated to {role_enum.value}",
                link_url=f"/main/events/{event.id}",
            )
            db.add(notif)
            db.commit()
            db.refresh(existing)
            recipient = db.query(User).filter(User.id == body.user_id).first()
            if recipient and recipient.email:
                send_event_role_update_email(email=recipient.email, event=event, new_role=role_enum)
            return existing
        return existing
    participant = EventParticipant(
        event_id=event.id,
        user_id=body.user_id,
        role=role_enum,
        description=body.description,
        join_method="invited",
        status=EventParticipantStatus.pending,
    )
    db.add(participant)
    # Create in-app notification
    notif = Notification(
        recipient_id=body.user_id,
        actor_id=current_user.id,
        type=NotificationType.event,
        content=f"You have been invited to '{event.title}' as {role_enum.value}",
        link_url=f"/main/events/{event.id}",
    )
    db.add(notif)
    db.commit()
    db.refresh(participant)
    # Send email notification (best-effort)
    recipient = db.query(User).filter(User.id == body.user_id).first()
    if recipient and recipient.email:
        send_event_invitation_email(email=recipient.email, event=event, role=role_enum, description=body.description)
    return participant

@router.delete("/events/{event_id}", status_code=204)
def delete_event(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    is_admin = any(
        r.name == "admin"
        for r in db.query(Role).join(user_roles, Role.id == user_roles.c.role_id).filter(user_roles.c.user_id == current_user.id).all()
    )
    if (not is_admin) and (event.organizer_id != current_user.id):
        raise HTTPException(status_code=403, detail="Only organizer or admin can delete events")
    event.deleted_at = func.now()
    db.add(event)
    db.commit()
    log_admin_action(db, current_user.id, "event.delete", "event", event.id)
    return Response(status_code=204)


@router.put("/events/{event_id}/participants/me/status", response_model=EventParticipantDetails)
def respond_event_invitation(
    event_id: uuid.UUID,
    body: EventParticipantResponseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    participant = (
        db.query(EventParticipant)
        .filter(EventParticipant.event_id == event.id, EventParticipant.user_id == current_user.id)
        .first()
    )
    if participant is None:
        raise HTTPException(status_code=404, detail="You are not a participant of this event")

    # Only allow accepted or rejected responses from pending state, keep it simple
    participant.status = body.status
    db.add(participant)
    db.commit()
    db.refresh(participant)
    notif = Notification(
        recipient_id=event.organizer_id,
        actor_id=current_user.id,
        type=NotificationType.event,
        content=f"A participant updated status to {body.status.value} for '{event.title}'",
        link_url=f"/main/events/{event.id}",
    )
    db.add(notif)
    db.commit()
    return participant


@router.post("/events/{event_id}/participants/bulk", response_model=List[EventParticipantDetails])
def invite_event_participants_bulk(
    event_id: uuid.UUID,
    body: EventParticipantBulkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Only organizer or committee can invite
    if event.organizer_id != current_user.id:
        my_participation = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        if my_participation is None or my_participation.role != EventParticipantRole.committee:
            raise HTTPException(status_code=403, detail="Not allowed to invite participants")

    created: list[EventParticipant] = []
    for item in body.items:
        try:
            role_enum = _parse_role(item.role)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid participant role")
        if role_enum == EventParticipantRole.organizer:
            # Skip organizer invitations in bulk
            continue

        existing = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == item.user_id,
            )
            .first()
        )
        if existing is not None:
            if existing.role != role_enum:
                existing.role = role_enum
                if item.description is not None:
                    existing.description = item.description
                db.add(existing)
                notif = Notification(
                    recipient_id=item.user_id,
                    actor_id=current_user.id,
                    type=NotificationType.event,
                    content=f"Your role for '{event.title}' has been updated to {role_enum.value}",
                    link_url=f"/main/events/{event.id}",
                )
                db.add(notif)
                created.append(existing)
            continue

        participant = EventParticipant(
            event_id=event.id,
            user_id=item.user_id,
            role=role_enum,
            description=item.description,
            join_method="invited",
            status=EventParticipantStatus.pending,
        )
        db.add(participant)
        # Create notification per invitee
        notif = Notification(
            recipient_id=item.user_id,
            actor_id=current_user.id,
            type=NotificationType.event,
            content=f"You have been invited to '{event.title}' as {role_enum.value}",
            link_url=f"/main/events/{event.id}",
        )
        db.add(notif)
        created.append(participant)

    db.commit()
    # Refresh all created participants
    for p in created:
        db.refresh(p)
        # Send email best-effort
        recipient = db.query(User).filter(User.id == p.user_id).first()
        if recipient and recipient.email:
            send_event_invitation_email(email=recipient.email, event=event, role=p.role, description=p.description)

    return created


@router.put("/events/{event_id}/participants/{participant_id}/role", response_model=EventParticipantDetails)
def update_event_participant_role(
    event_id: uuid.UUID,
    participant_id: uuid.UUID,
    body: EventParticipantRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Organizer updates a participant's role. Cannot modify organizer participant."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Only organizer can update roles
    if event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only organizer can update participant roles")

    participant = (
        db.query(EventParticipant)
        .filter(EventParticipant.id == participant_id, EventParticipant.event_id == event.id)
        .first()
    )
    if participant is None:
        raise HTTPException(status_code=404, detail="Participant not found")

    # Prevent changing organizer's role
    if participant.role == EventParticipantRole.organizer:
        raise HTTPException(status_code=400, detail="Cannot change organizer's role")

    # Update role
    participant.role = body.role
    db.add(participant)
    db.commit()
    db.refresh(participant)

    # Notify participant in-app
    notif = Notification(
        recipient_id=participant.user_id,
        actor_id=current_user.id,
        type=NotificationType.event,
        content=f"Your role for '{event.title}' has been updated to {body.role.value}",
        link_url=f"/main/events/{event.id}",
    )
    db.add(notif)
    db.commit()

    # Email best-effort
    recipient = db.query(User).filter(User.id == participant.user_id).first()
    if recipient and recipient.email:
        send_event_role_update_email(email=recipient.email, event=event, new_role=body.role)

    return participant


@router.put("/events/{event_id}/participants/{participant_id}/status", response_model=EventParticipantDetails)
def organizer_update_participant_status(
    event_id: uuid.UUID,
    participant_id: uuid.UUID,
    body: EventParticipantResponseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Organizer sets a participant's status to accepted or rejected."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only organizer can update participant status")
    participant = (
        db.query(EventParticipant)
        .filter(EventParticipant.id == participant_id, EventParticipant.event_id == event.id)
        .first()
    )
    if participant is None:
        raise HTTPException(status_code=404, detail="Participant not found")
    if participant.role == EventParticipantRole.organizer:
        raise HTTPException(status_code=400, detail="Cannot change organizer's status")
    if body.status not in (EventParticipantStatus.accepted, EventParticipantStatus.rejected):
        raise HTTPException(status_code=400, detail="Only accepted or rejected are allowed")
    participant.status = body.status
    db.add(participant)
    db.commit()
    db.refresh(participant)
    notif = Notification(
        recipient_id=participant.user_id,
        actor_id=current_user.id,
        type=NotificationType.event,
        content=f"Your participation status for '{event.title}' is now {body.status.value}",
        link_url=f"/main/events/{event.id}",
    )
    db.add(notif)
    db.commit()
    return participant

@router.delete("/events/{event_id}/participants/{participant_id}")
def remove_event_participant(
    event_id: uuid.UUID,
    participant_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Organizer removes a participant from the event. Cannot remove organizer participant."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Only organizer can remove
    if event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only organizer can remove participants")

    participant = (
        db.query(EventParticipant)
        .filter(EventParticipant.id == participant_id, EventParticipant.event_id == event.id)
        .first()
    )
    if participant is None:
        raise HTTPException(status_code=404, detail="Participant not found")

    # Prevent removing the organizer
    if participant.role == EventParticipantRole.organizer:
        raise HTTPException(status_code=400, detail="Cannot remove organizer participant")

    # Delete participant
    db.delete(participant)
    db.commit()

    # Notify participant in-app
    notif = Notification(
        recipient_id=participant.user_id,
        actor_id=current_user.id,
        type=NotificationType.event,
        content=f"You have been removed from '{event.title}'",
        link_url=f"/main/events/{event.id}",
    )
    db.add(notif)
    db.commit()

    log_admin_action(db, current_user.id, "event.participant.remove", "event", event.id)

    # Email best-effort
    recipient = db.query(User).filter(User.id == participant.user_id).first()
    if recipient and recipient.email:
        send_event_removed_email(email=recipient.email, event=event)

    return {"detail": "Participant removed"}

# --- Event-Category Relationships ---

@router.get("/events/{event_id}/categories", response_model=List[CategoryResponse])
def list_event_categories(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # For private events, restrict visibility similar to participants
    if event.visibility == EventVisibility.private:
        if current_user is None:
            raise HTTPException(status_code=403, detail="This event is private")
        if event.organizer_id != current_user.id:
            participant = (
                db.query(EventParticipant)
                .filter(
                    EventParticipant.event_id == event.id,
                    EventParticipant.user_id == current_user.id,
                )
                .first()
            )
            if participant is None:
                raise HTTPException(status_code=403, detail="This event is private")

    categories = (
        db.query(Category)
        .join(EventCategory, EventCategory.category_id == Category.id)
        .filter(EventCategory.event_id == event.id)
        .order_by(Category.name.asc())
        .all()
    )
    return categories


@router.post("/events/{event_id}/categories", response_model=List[CategoryResponse])
def attach_event_categories(
    event_id: uuid.UUID,
    body: EventCategoryAttach,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Only organizer or committee can modify categories
    if event.organizer_id != current_user.id:
        my_participation = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        if my_participation is None or my_participation.role != EventParticipantRole.committee:
            raise HTTPException(status_code=403, detail="Not allowed to modify event categories")

    # Attach categories if they exist and not already attached
    for cid in body.category_ids:
        category = db.query(Category).filter(Category.id == cid).first()
        if category is None:
            raise HTTPException(status_code=404, detail=f"Category {cid} not found")
        existing = (
            db.query(EventCategory)
            .filter(EventCategory.event_id == event.id, EventCategory.category_id == cid)
            .first()
        )
        if existing is None:
            link = EventCategory(event_id=event.id, category_id=cid)
            db.add(link)

    db.commit()

    categories = (
        db.query(Category)
        .join(EventCategory, EventCategory.category_id == Category.id)
        .filter(EventCategory.event_id == event.id)
        .order_by(Category.name.asc())
        .all()
    )
    return categories


# --- End Event (Organizer) ---

@router.get("/events/{event_id}/proposals", response_model=List[EventProposalResponse])
def list_event_proposals(
    event_id: uuid.UUID,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    is_admin = any(
        r.name == "admin"
        for r in db.query(Role).join(user_roles, Role.id == user_roles.c.role_id).filter(user_roles.c.user_id == current_user.id).all()
    )
    if not is_admin:
        if event.organizer_id != current_user.id:
            participant = (
                db.query(EventParticipant)
                .filter(
                    EventParticipant.event_id == event.id,
                    EventParticipant.user_id == current_user.id,
                )
                .first()
            )
            allowed_roles = (
                EventParticipantRole.committee,
                EventParticipantRole.speaker,
                EventParticipantRole.sponsor,
            )
            if participant is None or participant.role not in allowed_roles:
                raise HTTPException(status_code=403, detail="Not allowed")
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20
    proposals = (
        db.query(EventProposal)
        .filter(EventProposal.event_id == event.id)
        .order_by(EventProposal.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return proposals

@router.post("/events/{event_id}/proposals", response_model=EventProposalResponse)
async def create_event_proposal(
    event_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.organizer_id != current_user.id:
        my_participation = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        if my_participation is None or my_participation.role not in (EventParticipantRole.committee, EventParticipantRole.speaker):
            raise HTTPException(status_code=403, detail="Not allowed to create proposals")

    content_type = request.headers.get("content-type", "")
    title: str | None = None
    description: str | None = None
    file_url: str | None = None
    upload: UploadFile | None = None

    if "multipart/form-data" in content_type:
        form = await request.form()
        title = form.get("title")
        description = form.get("description")
        file_url = form.get("file_url")
        potential = form.get("file")
        upload = potential if hasattr(potential, "filename") else None
    else:
        try:
            payload = await request.json()
        except Exception:
            payload = {}
        title = payload.get("title")
        description = payload.get("description")
        file_url = payload.get("file_url")

    if upload and not file_url:
        file_url = upload_file(upload, "event_proposals")

    final_title = title or event.title
    final_description = description or event.description

    proposal = EventProposal(
        event_id=event.id,
        created_by_user_id=current_user.id,
        title=final_title,
        description=final_description,
        file_url=file_url,
    )
    db.add(proposal)
    db.commit()
    db.refresh(proposal)
    return proposal

@router.get("/events/{event_id}/proposals/{proposal_id}/comments", response_model=List[EventProposalCommentResponse])
def list_event_proposal_comments(
    event_id: uuid.UUID,
    proposal_id: uuid.UUID,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    proposal = db.query(EventProposal).filter(EventProposal.id == proposal_id, EventProposal.event_id == event.id).first()
    if proposal is None:
        raise HTTPException(status_code=404, detail="Proposal not found")
    is_admin = any(
        r.name == "admin"
        for r in db.query(Role).join(user_roles, Role.id == user_roles.c.role_id).filter(user_roles.c.user_id == current_user.id).all()
    )
    if not is_admin:
        if event.organizer_id != current_user.id:
            participant = (
                db.query(EventParticipant)
                .filter(
                    EventParticipant.event_id == event.id,
                    EventParticipant.user_id == current_user.id,
                )
                .first()
            )
            allowed_roles = (
                EventParticipantRole.committee,
                EventParticipantRole.speaker,
                EventParticipantRole.sponsor,
            )
            if participant is None or participant.role not in allowed_roles:
                raise HTTPException(status_code=403, detail="Not allowed")
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20
    comments = (
        db.query(EventProposalComment)
        .filter(EventProposalComment.proposal_id == proposal.id)
        .order_by(EventProposalComment.created_at.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return comments

@router.post("/events/{event_id}/proposals/{proposal_id}/comments", response_model=EventProposalCommentResponse)
def create_event_proposal_comment(
    event_id: uuid.UUID,
    proposal_id: uuid.UUID,
    body: EventProposalCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    proposal = db.query(EventProposal).filter(EventProposal.id == proposal_id, EventProposal.event_id == event.id).first()
    if proposal is None:
        raise HTTPException(status_code=404, detail="Proposal not found")
    participant = (
        db.query(EventParticipant)
        .filter(
            EventParticipant.event_id == event.id,
            EventParticipant.user_id == current_user.id,
        )
        .first()
    )
    if event.organizer_id != current_user.id and participant is None:
        raise HTTPException(status_code=403, detail="Not allowed to comment")
    comment = EventProposalComment(proposal_id=proposal.id, user_id=current_user.id, content=body.content)
    db.add(comment)
    notif = Notification(
        recipient_id=event.organizer_id,
        actor_id=current_user.id,
        type=NotificationType.event,
        content=f"A comment was added to a proposal for '{event.title}'",
        link_url=f"/main/events/{event.id}",
    )
    db.add(notif)
    # Notify proposal owner via in-app and email (best-effort) if not the same as organizer/actor
    if proposal.created_by_user_id != event.organizer_id and proposal.created_by_user_id != current_user.id:
        owner = db.query(User).filter(User.id == proposal.created_by_user_id).first()
        db.add(Notification(
            recipient_id=proposal.created_by_user_id,
            actor_id=current_user.id,
            type=NotificationType.event,
            content=f"A comment was added to your proposal for '{event.title}'",
            link_url=f"/main/events/{event.id}",
        ))
        if owner and owner.email:
            try:
                send_event_proposal_comment_email(email=owner.email, event=event, proposal=proposal, comment_content=body.content)
            except Exception:
                pass
    db.commit()
    db.refresh(comment)
    return comment

@router.put("/events/{event_id}/proposals/{proposal_id}", response_model=EventProposalResponse)
def update_event_proposal(
    event_id: uuid.UUID,
    proposal_id: uuid.UUID,
    body: EventProposalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.organizer_id != current_user.id:
        my_participation = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        proposal = db.query(EventProposal).filter(EventProposal.id == proposal_id, EventProposal.event_id == event.id).first()
        if proposal is None:
            raise HTTPException(status_code=404, detail="Proposal not found")
        if (my_participation is None or my_participation.role not in (EventParticipantRole.committee, EventParticipantRole.speaker)) and proposal.created_by_user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not allowed to update proposals")
    else:
        proposal = db.query(EventProposal).filter(EventProposal.id == proposal_id, EventProposal.event_id == event.id).first()
        if proposal is None:
            raise HTTPException(status_code=404, detail="Proposal not found")
    if body.title is not None:
        proposal.title = body.title
    if body.description is not None:
        proposal.description = body.description
    if body.file_url is not None:
        proposal.file_url = body.file_url
    db.add(proposal)
    db.commit()
    db.refresh(proposal)
    return proposal

@router.delete("/events/{event_id}/proposals/{proposal_id}", status_code=204)
def delete_event_proposal(
    event_id: uuid.UUID,
    proposal_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    proposal = db.query(EventProposal).filter(EventProposal.id == proposal_id, EventProposal.event_id == event.id).first()
    if proposal is None:
        raise HTTPException(status_code=404, detail="Proposal not found")
    if event.organizer_id != current_user.id:
        my_participation = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        if (my_participation is None or my_participation.role not in (EventParticipantRole.committee, EventParticipantRole.speaker)) and proposal.created_by_user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not allowed to delete proposals")
    db.query(EventProposalComment).filter(EventProposalComment.proposal_id == proposal.id).delete(synchronize_session=False)
    db.delete(proposal)
    db.commit()
    return

@router.put("/events/{event_id}/proposals/{proposal_id}/comments/{comment_id}", response_model=EventProposalCommentResponse)
def update_event_proposal_comment(
    event_id: uuid.UUID,
    proposal_id: uuid.UUID,
    comment_id: uuid.UUID,
    body: EventProposalCommentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    proposal = db.query(EventProposal).filter(EventProposal.id == proposal_id, EventProposal.event_id == event.id).first()
    if proposal is None:
        raise HTTPException(status_code=404, detail="Proposal not found")
    comment = (
        db.query(EventProposalComment)
        .filter(EventProposalComment.id == comment_id, EventProposalComment.proposal_id == proposal.id)
        .first()
    )
    if comment is None:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != current_user.id:
        if event.organizer_id != current_user.id:
            my_participation = (
                db.query(EventParticipant)
                .filter(
                    EventParticipant.event_id == event.id,
                    EventParticipant.user_id == current_user.id,
                )
                .first()
            )
            if my_participation is None or my_participation.role != EventParticipantRole.committee:
                raise HTTPException(status_code=403, detail="Not allowed to update comment")
    if body.content is not None:
        comment.content = body.content
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment

@router.delete("/events/{event_id}/proposals/{proposal_id}/comments/{comment_id}", status_code=204)
def delete_event_proposal_comment(
    event_id: uuid.UUID,
    proposal_id: uuid.UUID,
    comment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    proposal = db.query(EventProposal).filter(EventProposal.id == proposal_id, EventProposal.event_id == event.id).first()
    if proposal is None:
        raise HTTPException(status_code=404, detail="Proposal not found")
    comment = (
        db.query(EventProposalComment)
        .filter(EventProposalComment.id == comment_id, EventProposalComment.proposal_id == proposal.id)
        .first()
    )
    if comment is None:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != current_user.id:
        if event.organizer_id != current_user.id:
            my_participation = (
                db.query(EventParticipant)
                .filter(
                    EventParticipant.event_id == event.id,
                    EventParticipant.user_id == current_user.id,
                )
                .first()
            )
            if my_participation is None or my_participation.role != EventParticipantRole.committee:
                raise HTTPException(status_code=403, detail="Not allowed to delete comment")
    db.delete(comment)
    db.commit()
    return

@router.post("/events/{event_id}/end", response_model=EventDetails)
def end_event(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Organizer ends the event. Only allowed after event end time.
    Sets status to ended and marks non-attended audiences as absent.
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Only organizer can end the event
    if event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only organizer can end the event")

    now_utc = datetime.now(timezone.utc)
    ed = event.end_datetime
    if ed.tzinfo is None:
        ed = ed.replace(tzinfo=timezone.utc)
    if now_utc < ed:
        raise HTTPException(status_code=400, detail="Event has not ended yet")

    # Set status to ended
    event.status = EventStatus.ended
    db.add(event)

    # Mark audiences who did not attend as absent
    audience_roles = [
        EventParticipantRole.audience,
        EventParticipantRole.student,
        EventParticipantRole.teacher,
    ]
    not_attended = (
        db.query(EventParticipant)
        .filter(
            EventParticipant.event_id == event.id,
            EventParticipant.role.in_(audience_roles),
            EventParticipant.status == EventParticipantStatus.accepted,
        )
        .all()
    )
    for p in not_attended:
        p.status = EventParticipantStatus.absent
        db.add(p)

    db.commit()
    db.refresh(event)
    log_admin_action(db, current_user.id, "event.end", "event", event.id)
    return event


# --- Event Images (Organizer/Committee) ---

@router.put("/events/{event_id}/images/logo", response_model=EventDetails)
def update_event_logo(
    event_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Organizer or committee only
    if event.organizer_id != current_user.id:
        my_participation = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        if my_participation is None or my_participation.role != EventParticipantRole.committee:
            raise HTTPException(status_code=403, detail="Not allowed to update event logo")

    url = upload_file(file, "event_logos")
    event.logo_url = url
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.put("/events/{event_id}/images/cover", response_model=EventDetails)
def update_event_cover(
    event_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Organizer or committee only
    if event.organizer_id != current_user.id:
        my_participation = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        if my_participation is None or my_participation.role != EventParticipantRole.committee:
            raise HTTPException(status_code=403, detail="Not allowed to update event cover")

    url = upload_file(file, "event_covers")
    event.cover_url = url
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def _make_attendance_token(event_id: uuid.UUID, minutes_valid: int = 15) -> tuple[str, datetime]:
    exp = datetime.utcnow() + timedelta(minutes=minutes_valid)
    payload = f"{event_id}|{int(exp.timestamp())}"
    signature = hmac.new(settings.SECRET_KEY.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).digest()
    token = f"{base64.urlsafe_b64encode(payload.encode('utf-8')).decode('utf-8').rstrip('=')}.{base64.urlsafe_b64encode(signature).decode('utf-8').rstrip('=')}"
    return token, exp


def _verify_attendance_token(token: str) -> uuid.UUID:
    try:
        payload_b64, sig_b64 = token.split(".")
        # Pad base64 strings if needed
        def _pad(s: str) -> str:
            return s + "=" * ((4 - len(s) % 4) % 4)
        payload_raw = base64.urlsafe_b64decode(_pad(payload_b64)).decode("utf-8")
        sig = base64.urlsafe_b64decode(_pad(sig_b64))
        expected_sig = hmac.new(settings.SECRET_KEY.encode("utf-8"), payload_raw.encode("utf-8"), hashlib.sha256).digest()
        if not hmac.compare_digest(sig, expected_sig):
            raise HTTPException(status_code=400, detail="Invalid token signature")
        event_id_str, exp_ts_str = payload_raw.split("|")
        exp_ts = int(exp_ts_str)
        if int(datetime.utcnow().timestamp()) > exp_ts:
            raise HTTPException(status_code=400, detail="Token expired")
        return uuid.UUID(event_id_str)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid token")


@router.post("/events/{event_id}/attendance/qr", response_model=AttendanceQRResponse)
def generate_event_attendance_qr(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a short-lived QR token for event attendance.
    Only organizer or committee can generate.
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Organizer or committee only
    if event.organizer_id != current_user.id:
        my_participation = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        if my_participation is None or my_participation.role != EventParticipantRole.committee:
            raise HTTPException(status_code=403, detail="Not allowed to generate attendance QR")

    token, exp = _make_attendance_token(event_id)
    return AttendanceQRResponse(token=token, expires_at=exp)


@router.get("/events/{event_id}/attendance/qr.png")
def get_event_attendance_qr_png(
    event_id: uuid.UUID,
    minutes_valid: int = Query(15, ge=1, le=180),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return a PNG QR image for a short-lived attendance token.
    Only organizer or committee can generate.
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Organizer or committee only
    if event.organizer_id != current_user.id:
        my_participation = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        if my_participation is None or my_participation.role != EventParticipantRole.committee:
            raise HTTPException(status_code=403, detail="Not allowed to generate attendance QR")

    token, _ = _make_attendance_token(event_id, minutes_valid=minutes_valid)

    try:
        import qrcode
        img = qrcode.make(token)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        png_bytes = buf.getvalue()
        return Response(content=png_bytes, media_type="image/png")
    except ImportError:
        raise HTTPException(status_code=500, detail="qrcode library not installed. Please add 'qrcode' and 'Pillow' to requirements.")


@router.post("/events/attendance/scan", response_model=EventParticipantDetails)
def scan_event_attendance(
    body: AttendanceScanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark current user as attended for event defined by QR token.
    User must already be a participant. If not logged in, provide the email
    used for event registration. Idempotent if already attended.
    """
    event_id = _verify_attendance_token(body.token)
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Attendance only during event live window for published events
    now_utc = datetime.now(timezone.utc)
    if event.status != EventStatus.published:
        raise HTTPException(status_code=400, detail="Event is not published")
    start_dt = event.start_datetime
    end_dt = event.end_datetime
    if start_dt.tzinfo is None:
        start_dt = start_dt.replace(tzinfo=timezone.utc)
    if end_dt.tzinfo is None:
        end_dt = end_dt.replace(tzinfo=timezone.utc)
    if now_utc > end_dt:
        raise HTTPException(status_code=400, detail="Attendance is only available until the event end time")

    target_user_id: uuid.UUID | None = current_user.id

    participant = (
        db.query(EventParticipant)
        .filter(EventParticipant.event_id == event.id, EventParticipant.user_id == target_user_id)
        .first()
    )
    if participant is None:
        raise HTTPException(status_code=403, detail="You are not a participant of this event. Join before start time.")

    # Optional: disallow attendance before event starts
    # if event.start_datetime > func.now():
    #     raise HTTPException(status_code=400, detail="Attendance can only be marked during/after the event")

    # Only accepted participants can mark attendance; idempotent if already attended
    if participant.status == EventParticipantStatus.accepted:
        participant.status = EventParticipantStatus.attended
        db.add(participant)
        notif = Notification(
            recipient_id=participant.user_id,
            actor_id=participant.user_id,
            type=NotificationType.event,
            content=f"Attendance recorded for '{event.title}'",
            link_url=f"/main/events/{event.id}",
        )
        db.add(notif)
        db.commit()
        db.refresh(participant)
        return participant
    elif participant.status == EventParticipantStatus.attended:
        return participant
    else:
        raise HTTPException(status_code=403, detail="Only accepted participants can mark attendance")


@router.post("/events/{event_id}/attendance/walk_in", response_model=EventParticipantDetails)
def walk_in_event_attendance(
    event_id: uuid.UUID,
    body: WalkInAttendanceRequest,
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.id == event_id, Event.deleted_at.is_(None)).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    now_utc = datetime.now(timezone.utc)
    if event.status != EventStatus.published:
        raise HTTPException(status_code=400, detail="Event is not published")
    start_dt = event.start_datetime
    end_dt = event.end_datetime
    if start_dt.tzinfo is None:
        start_dt = start_dt.replace(tzinfo=timezone.utc)
    if end_dt.tzinfo is None:
        end_dt = end_dt.replace(tzinfo=timezone.utc)
    if now_utc > end_dt:
        raise HTTPException(status_code=400, detail="Attendance is only available until the event end time")

    email_norm = body.email.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == email_norm).first()
    if user is None:
        rnd_pwd = base64.urlsafe_b64encode(os.urandom(24)).decode("utf-8").rstrip("=")
        user = create_user(db, UserCreate(email=email_norm, password=rnd_pwd))
        prof = db.query(Profile).filter(Profile.user_id == user.id).first()
        if prof:
            prof.full_name = body.name
            db.add(prof)
            db.commit()
            db.refresh(prof)

    participant = (
        db.query(EventParticipant)
        .filter(EventParticipant.event_id == event.id, EventParticipant.user_id == user.id)
        .first()
    )
    if participant is None:
        participant = EventParticipant(
            event_id=event.id,
            user_id=user.id,
            role=EventParticipantRole.audience,
            description=None,
            join_method="walk_in",
            status=EventParticipantStatus.attended,
        )
        db.add(participant)
        notif = Notification(
            recipient_id=user.id,
            actor_id=user.id,
            type=NotificationType.event,
            content=f"Attendance recorded for '{event.title}'",
            link_url=f"/main/events/{event.id}",
        )
        db.add(notif)
        db.commit()
        db.refresh(participant)
        return participant
    else:
        if participant.status in (EventParticipantStatus.accepted, EventParticipantStatus.pending):
            participant.status = EventParticipantStatus.attended
            participant.join_method = participant.join_method or "walk_in"
            db.add(participant)
            db.commit()
            db.refresh(participant)
            return participant
        return participant


# --- Reminder Endpoints ---

@router.post("/events/{event_id}/reminders", response_model=EventReminderResponse)
def create_event_reminder(
    event_id: uuid.UUID,
    body: EventReminderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a reminder for a joined event. Options: one_week, three_days, one_day."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Must be organizer or a participant of the event
    if event.organizer_id != current_user.id:
        my_participation = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        if my_participation is None:
            raise HTTPException(status_code=403, detail="You must join the event to set a reminder")

    delta_map = {
        "one_week": timedelta(days=7),
        "three_days": timedelta(days=3),
        "one_day": timedelta(days=1),
    }
    if body.option not in delta_map:
        raise HTTPException(status_code=400, detail="Invalid reminder option. Use one_week, three_days, or one_day")

    # Duplication guard: prevent creating multiple unsent reminders for the same (user, event, option)
    existing_unsent = (
        db.query(EventReminder)
        .filter(
            EventReminder.event_id == event.id,
            EventReminder.user_id == current_user.id,
            EventReminder.option == body.option,
            EventReminder.is_sent == False,
        )
        .first()
    )
    if existing_unsent is not None:
        raise HTTPException(status_code=409, detail="Reminder for this option already exists")

    remind_at = event.start_datetime - delta_map[body.option]

    reminder = EventReminder(
        event_id=event.id,
        user_id=current_user.id,
        option=body.option,
        remind_at=remind_at,
        is_sent=False,
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder

@router.get("/events/reminders/me", response_model=list[EventReminderResponse])
def list_my_event_reminders(
    upcoming_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now_utc = datetime.now(timezone.utc)
    q = db.query(EventReminder).filter(EventReminder.user_id == current_user.id)
    if upcoming_only:
        q = q.filter(EventReminder.remind_at >= now_utc, EventReminder.is_sent == False)
    items = q.order_by(EventReminder.remind_at.asc()).all()
    return items


@router.post("/events/reminders/run", response_model=list[EventReminderResponse])
def run_due_event_reminders(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Process and send due reminders for the current user.
    Sends both in-app notification and email (best-effort).
    """
    now = datetime.now(timezone.utc)
    due = (
        db.query(EventReminder)
        .filter(
            EventReminder.user_id == current_user.id,
            EventReminder.is_sent == False,
            EventReminder.remind_at <= now,
        )
        .order_by(EventReminder.remind_at.asc())
        .limit(limit)
        .all()
    )

    processed: list[EventReminder] = []
    for r in due:
        event = db.query(Event).filter(Event.id == r.event_id).first()
        if event is None:
            # Skip invalid
            r.is_sent = True
            r.sent_at = now
            db.add(r)
            continue

        # In-app notification
        notif = Notification(
            recipient_id=r.user_id,
            actor_id=r.user_id,
            type=NotificationType.event,
            content=f"Reminder: '{event.title}' starts at {event.start_datetime}",
            link_url=f"/main/events/{event.id}",
        )
        db.add(notif)

        # Email best-effort
        user = db.query(User).filter(User.id == r.user_id).first()
        if user and user.email:
            try:
                send_event_reminder_email(email=user.email, event=event, when_label=r.option)
            except Exception:
                pass

        r.is_sent = True
        r.sent_at = now
        db.add(r)
        processed.append(r)

    db.commit()
    # Refresh processed reminders
    for pr in processed:
        db.refresh(pr)
    return processed


# --- Attendance Stats (Organizer/Committee) ---

@router.get("/events/{event_id}/attendance/stats", response_model=EventAttendanceStats)
def get_event_attendance_stats(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return attendance stats for audiences and overall participants.
    Accessible by organizer or committee.
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Organizer or committee only
    if event.organizer_id != current_user.id:
        my_participation = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        if my_participation is None or my_participation.role != EventParticipantRole.committee:
            raise HTTPException(status_code=403, detail="Not allowed to view attendance stats")

    audience_roles = [
        EventParticipantRole.audience,
        EventParticipantRole.student,
        EventParticipantRole.teacher,
    ]
    total_audience = (
        db.query(EventParticipant)
        .filter(EventParticipant.event_id == event.id, EventParticipant.role.in_(audience_roles))
        .count()
    )
    attended_audience = (
        db.query(EventParticipant)
        .filter(
            EventParticipant.event_id == event.id,
            EventParticipant.role.in_(audience_roles),
            EventParticipant.status == EventParticipantStatus.attended,
        )
        .count()
    )
    absent_audience = (
        db.query(EventParticipant)
        .filter(
            EventParticipant.event_id == event.id,
            EventParticipant.role.in_(audience_roles),
            EventParticipant.status == EventParticipantStatus.absent,
        )
        .count()
    )
    total_participants = (
        db.query(EventParticipant)
        .filter(EventParticipant.event_id == event.id)
        .count()
    )
    attended_total = (
        db.query(EventParticipant)
        .filter(
            EventParticipant.event_id == event.id,
            EventParticipant.status == EventParticipantStatus.attended,
        )
        .count()
    )

    return EventAttendanceStats(
        event_id=event.id,
        total_audience=total_audience,
        attended_audience=attended_audience,
        absent_audience=absent_audience,
        total_participants=total_participants,
        attended_total=attended_total,
    )


# --- Scheduler (Transitions) ---

@router.post("/events/scheduler/run")
def run_event_scheduler(
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run event status transitions:
    - Close registration at start time for published events
    - End events after end time and mark absent for accepted audiences
    Organizer-only for now. In production, wire to a backend scheduler.
    """
    # Only admins/organizers could be allowed; for now allow any authenticated user
    now = datetime.now(timezone.utc)
    updated = 0

    # Close registration
    to_close = (
        db.query(Event)
        .filter(
            Event.status == EventStatus.published,
            Event.start_datetime <= now,
        )
        .limit(limit)
        .all()
    )
    for e in to_close:
        if getattr(e, "registration_status", None) == EventRegistrationStatus.opened:
            e.registration_status = EventRegistrationStatus.closed
            db.add(e)
            updated += 1

    # End events and mark absents
    to_end = (
        db.query(Event)
        .filter(
            Event.status == EventStatus.published,
            Event.end_datetime < now,
        )
        .limit(limit)
        .all()
    )
    for e in to_end:
        e.status = EventStatus.ended
        db.add(e)
        audience_roles = [
            EventParticipantRole.audience,
            EventParticipantRole.student,
            EventParticipantRole.teacher,
        ]
        not_attended = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == e.id,
                EventParticipant.role.in_(audience_roles),
                EventParticipant.status == EventParticipantStatus.accepted,
            )
            .all()
        )
        for p in not_attended:
            p.status = EventParticipantStatus.absent
            db.add(p)
        updated += 1

    db.commit()
    return {"updated": updated}


# --- Event Checklist (Organizer/Committee) ---

@router.get("/events/{event_id}/checklist", response_model=list[EventChecklistItemResponse])
def list_event_checklist(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Organizer or committee only
    if event.organizer_id != current_user.id:
        my_participation = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        if my_participation is None or my_participation.role != EventParticipantRole.committee:
            raise HTTPException(status_code=403, detail="Not allowed to view checklist")

    items = (
        db.query(EventChecklistItem)
        .filter(EventChecklistItem.event_id == event.id)
        .order_by(EventChecklistItem.sort_order.asc(), EventChecklistItem.created_at.asc())
        .all()
    )
    return items

@router.get("/events/checklist/me", response_model=list[EventChecklistItemResponse])
def list_my_checklist_items(
    only_open: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(EventChecklistItem).filter(EventChecklistItem.assigned_user_id == current_user.id)
    if only_open:
        q = q.filter(EventChecklistItem.is_completed == False)
    items = q.order_by(EventChecklistItem.due_datetime.asc(), EventChecklistItem.sort_order.asc()).all()
    return items


@router.post("/events/{event_id}/checklist", response_model=EventChecklistItemResponse)
def create_event_checklist_item(
    event_id: uuid.UUID,
    body: EventChecklistItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Organizer or committee only
    if event.organizer_id != current_user.id:
        my_participation = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        if my_participation is None or my_participation.role != EventParticipantRole.committee:
            raise HTTPException(status_code=403, detail="Not allowed to create checklist")

    # Validate due date if provided: must be in future and not after event start
    if body.due_datetime is not None:
        due = body.due_datetime
        if due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)
        event_start = event.start_datetime
        if event_start.tzinfo is None:
            event_start = event_start.replace(tzinfo=timezone.utc)
        now_utc = datetime.now(timezone.utc)
        if due < now_utc:
            raise HTTPException(status_code=400, detail="Due date must be in the future")
        if due > event_start:
            raise HTTPException(status_code=400, detail="Due date must be on or before event start time")

    item = EventChecklistItem(
        event_id=event.id,
        title=body.title,
        description=body.description,
        assigned_user_id=body.assigned_user_id,
        due_datetime=body.due_datetime,
        created_by_user_id=current_user.id,
        is_completed=False,
        sort_order=0,
    )
    if body.assigned_user_id is not None:
        assigned = db.query(User).filter(User.id == body.assigned_user_id).first()
        if assigned is None:
            raise HTTPException(status_code=400, detail="Assigned user not found")
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/events/{event_id}/checklist/{item_id}", response_model=EventChecklistItemResponse)
def update_event_checklist_item(
    event_id: uuid.UUID,
    item_id: uuid.UUID,
    body: EventChecklistItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Organizer or committee only
    if event.organizer_id != current_user.id:
        my_participation = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        if my_participation is None or my_participation.role != EventParticipantRole.committee:
            raise HTTPException(status_code=403, detail="Not allowed to update checklist")

    item = (
        db.query(EventChecklistItem)
        .filter(EventChecklistItem.id == item_id, EventChecklistItem.event_id == event.id)
        .first()
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Checklist item not found")

    if body.title is not None:
        item.title = body.title
    if body.description is not None:
        item.description = body.description
    if body.is_completed is not None:
        item.is_completed = body.is_completed
    # Explicitly clear assignment if provided as null
    if "assigned_user_id" in body.model_fields_set and body.assigned_user_id is None:
        item.assigned_user_id = None
    if body.assigned_user_id is not None:
        assigned = db.query(User).filter(User.id == body.assigned_user_id).first()
        if assigned is None:
            raise HTTPException(status_code=400, detail="Assigned user not found")
        item.assigned_user_id = body.assigned_user_id
    if body.sort_order is not None:
        item.sort_order = body.sort_order
    # Explicitly clear due date if provided as null
    if "due_datetime" in body.model_fields_set and body.due_datetime is None:
        item.due_datetime = None
    if body.due_datetime is not None:
        due = body.due_datetime
        if due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)
        event_start = event.start_datetime
        if event_start.tzinfo is None:
            event_start = event_start.replace(tzinfo=timezone.utc)
        now_utc = datetime.now(timezone.utc)
        if due < now_utc:
            raise HTTPException(status_code=400, detail="Due date must be in the future")
        if due > event_start:
            raise HTTPException(status_code=400, detail="Due date must be on or before event start time")
        item.due_datetime = due

    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/events/{event_id}/checklist/{item_id}")
def delete_event_checklist_item(
    event_id: uuid.UUID,
    item_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Organizer or committee only
    if event.organizer_id != current_user.id:
        my_participation = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        if my_participation is None or my_participation.role != EventParticipantRole.committee:
            raise HTTPException(status_code=403, detail="Not allowed to delete checklist item")

    item = (
        db.query(EventChecklistItem)
        .filter(EventChecklistItem.id == item_id, EventChecklistItem.event_id == event.id)
        .first()
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Checklist item not found")

    db.delete(item)
    db.commit()
    return {"detail": "Checklist item deleted"}
@router.put("/events/{event_id}", response_model=EventDetails)
def update_event(
    event_id: uuid.UUID,
    body: EventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Only organizer can update core event details
    if event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only organizer can update event")

    # Validate date range if provided
    if body.start_datetime is not None and body.end_datetime is not None:
        if body.end_datetime <= body.start_datetime:
            raise HTTPException(status_code=400, detail="End datetime must be after start datetime")

    if body.max_participant is not None and body.max_participant is not None and body.max_participant <= 0:
        raise HTTPException(status_code=400, detail="max_participant must be a positive integer")

    # Apply partial updates
    if body.title is not None:
        event.title = body.title
    if body.description is not None:
        event.description = body.description
    if body.logo_url is not None:
        event.logo_url = body.logo_url
    if body.cover_url is not None:
        event.cover_url = body.cover_url
    if body.format is not None:
        event.format = body.format
        # derive type if not provided
        if body.type is None:
            event.type = EventType.online if event.format == EventFormat.webinar else EventType.offline
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

    db.add(event)
    db.commit()
    db.refresh(event)
    return event

@router.delete("/events/{event_id}", status_code=204)
def delete_event(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id, Event.deleted_at.is_(None)).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only organizer can delete event")
    # Soft-delete: mark the event as deleted and retain history
    event.deleted_at = func.now()
    db.add(event)
    db.commit()
    log_admin_action(db, current_user.id, "event.delete", "event", event_id)
    return

# --- Category Admin Management ---

@router.put("/categories/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: uuid.UUID,
    body: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    # Case-insensitive uniqueness check
    existing = (
        db.query(Category)
        .filter(func.lower(Category.name) == func.lower(body.name), Category.id != category_id)
        .first()
    )
    if existing is not None:
        raise HTTPException(status_code=400, detail="Category already exists")
    category.name = body.name
    db.add(category)
    db.commit()
    db.refresh(category)
    return category

@router.delete("/categories/{category_id}", status_code=204)
def delete_category(
    category_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    db.query(EventCategory).filter(EventCategory.category_id == category_id).delete(synchronize_session=False)
    db.delete(category)
    db.commit()
    return
@router.post("/events/{event_id}/attendance/user_qr", response_model=AttendanceQRResponse)
def generate_user_attendance_qr(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    participant = (
        db.query(EventParticipant)
        .filter(EventParticipant.event_id == event.id, EventParticipant.user_id == current_user.id)
        .first()
    )
    if participant is None:
        raise HTTPException(status_code=403, detail="Not a participant of this event")
    token, exp = _make_user_attendance_token(event.id, current_user.id)
    return AttendanceQRResponse(token=token, expires_at=exp)


@router.get("/events/{event_id}/attendance/user_qr.png")
def get_user_attendance_qr_png(
    event_id: uuid.UUID,
    minutes_valid: int = Query(15, ge=1, le=180),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    participant = (
        db.query(EventParticipant)
        .filter(EventParticipant.event_id == event.id, EventParticipant.user_id == current_user.id)
        .first()
    )
    if participant is None:
        raise HTTPException(status_code=403, detail="Not a participant of this event")
    token, _ = _make_user_attendance_token(event.id, current_user.id, minutes_valid=minutes_valid)
    import qrcode, io
    img = qrcode.make(token)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    png_bytes = buf.getvalue()
    return Response(content=png_bytes, media_type="image/png")


@router.post("/events/{event_id}/attendance/scan_user", response_model=EventParticipantDetails)
def scan_user_attendance(
    event_id: uuid.UUID,
    body: AttendanceUserScanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.organizer_id != current_user.id:
        my_participation = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == current_user.id,
            )
            .first()
        )
        if my_participation is None or my_participation.role != EventParticipantRole.committee:
            raise HTTPException(status_code=403, detail="Not allowed")
    tok_event_id, tok_user_id = _verify_user_attendance_token(body.token)
    if tok_event_id != event.id:
        raise HTTPException(status_code=400, detail="Invalid token for event")
    participant = (
        db.query(EventParticipant)
        .filter(EventParticipant.event_id == event.id, EventParticipant.user_id == tok_user_id)
        .first()
    )
    if participant is None:
        raise HTTPException(status_code=404, detail="Participant not found")
    participant.status = EventParticipantStatus.attended
    participant.join_method = participant.join_method or "qr_scan"
    db.add(participant)
    notif = Notification(
        recipient_id=participant.user_id,
        actor_id=current_user.id,
        type=NotificationType.event,
        content=f"Attendance recorded for '{event.title}'",
        link_url=f"/main/events/{event.id}",
    )
    db.add(notif)
    db.commit()
    db.refresh(participant)
    return participant
