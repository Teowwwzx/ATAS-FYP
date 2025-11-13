from fastapi import APIRouter, Depends, HTTPException, Query
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
    EventCategory,
    Category,
    EventParticipant,
    EventParticipantRole,
    EventParticipantStatus,
    EventVisibility,
    EventStatus,
    EventType,
)
from app.models.notification_model import Notification, NotificationType
from app.services.email_service import (
    send_event_invitation_email,
    send_event_role_update_email,
    send_event_removed_email,
    send_event_joined_email,
    send_event_reminder_email,
)
from app.schemas.event_schema import (
    EventDetails,
    EventCreate,
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
    EventReminderCreate,
    EventReminderResponse,
    MyEventItem,
    EventAttendanceStats,
    EventChecklistItemCreate,
    EventChecklistItemUpdate,
    EventChecklistItemResponse,
)
from typing import List
from app.dependencies import get_current_user, get_current_user_optional
from app.models.user_model import User
from app.models.event_model import EventReminder
from app.models.event_model import EventChecklistItem
from app.core.config import settings

router = APIRouter()

@router.get("/events", response_model=List[EventDetails])
def get_all_events(
    db: Session = Depends(get_db),
    category_id: uuid.UUID | None = Query(None),
    category_name: str | None = Query(None),
    upcoming: bool | None = Query(None),
):
    """List public events, with optional filters:
    - category_id or category_name: filter events linked to a category
    - upcoming=true: only events starting at or after now
    """
    query = db.query(Event).filter(Event.visibility == EventVisibility.public)

    if upcoming:
        query = query.filter(Event.start_datetime >= func.now())

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

    events = query.all()
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
    if event.end_datetime <= event.start_datetime:
        raise HTTPException(status_code=400, detail="End datetime must be after start datetime")
    if event.max_participant is not None and event.max_participant <= 0:
        raise HTTPException(status_code=400, detail="max_participant must be a positive integer")
    db_event = Event(
        organizer_id=current_user.id,
        title=event.title,
        description=event.description,
        logo_url=event.logo_url,
        cover_url=event.cover_url,
        format=event.format,
        type=event.type,
        start_datetime=event.start_datetime,
        end_datetime=event.end_datetime,
        registration_type=event.registration_type,
        visibility=event.visibility,
        max_participant=event.max_participant,
        venue_place_id=event.venue_place_id,
        venue_remark=event.venue_remark,
        remark=event.remark,
    )

    db.add(db_event)
    db.commit()
    db.refresh(db_event)

    # Assign organizer participant
    organizer_participant = EventParticipant(
        event_id=db_event.id,
        user_id=current_user.id,
        role=EventParticipantRole.organizer,
        status=EventParticipantStatus.accepted,
        description=None,
    )
    db.add(organizer_participant)
    db.commit()

    return db_event


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
        )

    for link in participation_links:
        e = db.query(Event).filter(Event.id == link.event_id).first()
        if e is None:
            continue
        # Favor organizer role if exists
        event_map[e.id] = MyEventItem(
            event_id=e.id,
            title=e.title,
            start_datetime=e.start_datetime,
            end_datetime=e.end_datetime,
            type=e.type,
            status=e.status,
            my_role=link.role,
        )

    return list(event_map.values())


@router.get("/events/{event_id}", response_model=EventDetails)
def get_event_details(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.visibility == EventVisibility.public:
        return event

    # Private event: allow organizer or any participant to view
    if current_user is not None:
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

    participants = (
        db.query(EventParticipant)
        .filter(EventParticipant.event_id == event.id)
        .all()
    )
    return participants


@router.post("/events/{event_id}/join", response_model=EventParticipantDetails)
def join_public_event(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Allow a signed-in user to join a public, opened event as audience.
    - Prevent duplicate joins
    - Respect max_participant capacity (counts pending/accepted/attended)
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.visibility != EventVisibility.public:
        raise HTTPException(status_code=403, detail="This event is not public")

    if event.status != EventStatus.opened:
        raise HTTPException(status_code=400, detail="Event is not open for joining")

    # Only allow joining before the event starts (pre-registration)
    now_utc = datetime.now(timezone.utc)
    if now_utc >= event.start_datetime:
        raise HTTPException(
            status_code=400,
            detail="Event has already started. Joining is closed. For physical events, please mark attendance as walk-in."
        )

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
        raise HTTPException(status_code=409, detail="You have already joined this event")

    # Capacity check
    if event.max_participant is not None:
        active_count = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.status.in_(
                    [
                        EventParticipantStatus.pending,
                        EventParticipantStatus.accepted,
                        EventParticipantStatus.attended,
                    ]
                ),
            )
            .count()
        )
        if active_count >= event.max_participant:
            raise HTTPException(status_code=400, detail="Event is full")

    participant = EventParticipant(
        event_id=event.id,
        user_id=current_user.id,
        role=EventParticipantRole.audience,
        description=None,
        join_method="pre_registered",
        status=EventParticipantStatus.accepted,
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

    # Check duplicate
    existing = (
        db.query(EventParticipant)
        .filter(
            EventParticipant.event_id == event.id,
            EventParticipant.user_id == body.user_id,
        )
        .first()
    )
    if existing is not None:
        raise HTTPException(status_code=400, detail="Participant already exists")

    participant = EventParticipant(
        event_id=event.id,
        user_id=body.user_id,
        role=body.role,
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
        content=f"You have been invited to '{event.title}' as {body.role.value}",
        link_url=f"/main/events/{event.id}",
    )
    db.add(notif)
    db.commit()
    db.refresh(participant)
    # Send email notification (best-effort)
    recipient = db.query(User).filter(User.id == body.user_id).first()
    if recipient and recipient.email:
        send_event_invitation_email(email=recipient.email, event=event, role=body.role, description=body.description)
    return participant


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
        # Restrict roles to speaker or audience per requirement
        if item.role not in (EventParticipantRole.speaker, EventParticipantRole.audience):
            raise HTTPException(status_code=400, detail="Only 'speaker' or 'audience' roles are allowed for bulk invitation")

        existing = (
            db.query(EventParticipant)
            .filter(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id == item.user_id,
            )
            .first()
        )
        if existing is not None:
            # Skip duplicates silently for bulk operation
            continue

        participant = EventParticipant(
            event_id=event.id,
            user_id=item.user_id,
            role=item.role,
            description=item.description,
            status=EventParticipantStatus.pending,
        )
        db.add(participant)
        # Create notification per invitee
        notif = Notification(
            recipient_id=item.user_id,
            actor_id=current_user.id,
            type=NotificationType.event,
            content=f"You have been invited to '{event.title}' as {item.role.value}",
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

@router.post("/events/{event_id}/end", response_model=EventDetails)
def end_event(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Organizer ends the event. Only allowed after event end time.
    Sets status to completed and marks non-attended audiences as absent.
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Only organizer can end the event
    if event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only organizer can end the event")

    now_utc = datetime.now(timezone.utc)
    if now_utc < event.end_datetime:
        raise HTTPException(status_code=400, detail="Event has not ended yet")

    # Set status to completed
    event.status = EventStatus.completed
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
            EventParticipant.status.in_([EventParticipantStatus.pending, EventParticipantStatus.accepted]),
        )
        .all()
    )
    for p in not_attended:
        p.status = EventParticipantStatus.absent
        db.add(p)

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
    current_user: User | None = Depends(get_current_user_optional),
):
    """Mark current user as attended for event defined by QR token.
    User must already be a participant. If not logged in, provide the email
    used for event registration. Idempotent if already attended.
    """
    event_id = _verify_attendance_token(body.token)
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    target_user_id: uuid.UUID | None = None
    if current_user is not None:
        target_user_id = current_user.id
    else:
        # Fallback to email-based attendance
        if body.email is None or not body.email.strip():
            raise HTTPException(status_code=401, detail="Login or provide the email used for this event")
        user = db.query(User).filter(func.lower(User.email) == func.lower(body.email.strip())).first()
        if user is None:
            raise HTTPException(status_code=404, detail="Email not found")
        target_user_id = user.id

    participant = (
        db.query(EventParticipant)
        .filter(EventParticipant.event_id == event.id, EventParticipant.user_id == target_user_id)
        .first()
    )
    if participant is None:
        # Allow walk-in attendance for physical events (offline/hybrid) if requested
        if body.walk_in:
            if event.status != EventStatus.opened:
                raise HTTPException(status_code=400, detail="Event is not open for attendance")
            if event.type not in (EventType.offline, EventType.hybrid):
                raise HTTPException(status_code=400, detail="Walk-in attendance is only allowed for physical events")
            now_utc = datetime.now(timezone.utc)
            if now_utc < event.start_datetime:
                raise HTTPException(status_code=400, detail="Walk-in attendance is only allowed on/after the event start time")

            # Create participant as walk-in and mark attended immediately
            participant = EventParticipant(
                event_id=event.id,
                user_id=target_user_id,
                role=EventParticipantRole.audience,
                description="walk_in",
                join_method="walk_in",
                status=EventParticipantStatus.attended,
            )
            db.add(participant)
            # Notify user
            notif = Notification(
                recipient_id=target_user_id,
                actor_id=target_user_id,
                type=NotificationType.event,
                content=f"Attendance recorded (walk-in) for '{event.title}'",
                link_url=f"/main/events/{event.id}",
            )
            db.add(notif)
            db.commit()
            db.refresh(participant)
            return participant
        else:
            raise HTTPException(status_code=403, detail="You are not a participant of this event. Join before start time or mark walk-in attendance for physical events.")

    # Optional: disallow attendance before event starts
    # if event.start_datetime > func.now():
    #     raise HTTPException(status_code=400, detail="Attendance can only be marked during/after the event")

    # Mark attended if not already
    # For existing participants, mark attended if not already
    if participant.status != EventParticipantStatus.attended:
        participant.status = EventParticipantStatus.attended
        # Annotate as walk-in if requested
        if body.walk_in and (participant.description is None or participant.description.strip() == ""):
            participant.description = "walk_in"
        db.add(participant)
        # Create in-app notification
        notif = Notification(
            recipient_id=participant.user_id,
            actor_id=participant.user_id,
            type=NotificationType.event,
            content=f"Attendance recorded{' (walk-in)' if body.walk_in else ''} for '{event.title}'",
            link_url=f"/main/events/{event.id}",
        )
        db.add(notif)
        db.commit()
        db.refresh(participant)
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
    if body.assigned_user_id is not None:
        item.assigned_user_id = body.assigned_user_id
    if body.sort_order is not None:
        item.sort_order = body.sort_order
    if body.due_datetime is not None:
        item.due_datetime = body.due_datetime

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