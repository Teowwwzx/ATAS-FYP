from pydantic import BaseModel
import uuid
from datetime import datetime
from app.models.event_model import (
    EventFormat,
    EventType,
    EventRegistrationType,
    EventStatus,
    EventVisibility,
    EventParticipantRole,
    EventParticipantStatus,
)

class EventCreate(BaseModel):
    title: str
    description: str | None = None
    logo_url: str | None = None
    cover_url: str | None = None
    format: EventFormat
    type: EventType
    start_datetime: datetime
    end_datetime: datetime
    registration_type: EventRegistrationType
    visibility: EventVisibility = EventVisibility.public
    max_participant: int | None = None
    venue_place_id: str | None = None
    venue_remark: str | None = None
    remark: str | None = None

class EventDetails(BaseModel):
    id: uuid.UUID
    organizer_id: uuid.UUID
    title: str
    description: str | None = None
    logo_url: str | None = None
    cover_url: str | None = None
    format: EventFormat
    type: EventType
    start_datetime: datetime
    end_datetime: datetime
    registration_type: EventRegistrationType
    status: EventStatus
    visibility: EventVisibility
    max_participant: int | None = None
    venue_place_id: str | None = None
    venue_remark: str | None = None
    remark: str | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class EventParticipantDetails(BaseModel):
    id: uuid.UUID
    event_id: uuid.UUID
    user_id: uuid.UUID
    role: EventParticipantRole
    description: str | None = None
    join_method: str | None = None
    status: EventParticipantStatus
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class EventParticipantCreate(BaseModel):
    user_id: uuid.UUID
    role: EventParticipantRole = EventParticipantRole.audience
    description: str | None = None


class EventParticipantResponseUpdate(BaseModel):
    status: EventParticipantStatus


class EventParticipantBulkCreate(BaseModel):
    items: list[EventParticipantCreate]


class EventParticipantRoleUpdate(BaseModel):
    role: EventParticipantRole


# --- Category Schemas ---

class CategoryBase(BaseModel):
    name: str


class CategoryCreate(CategoryBase):
    pass


class CategoryResponse(CategoryBase):
    id: uuid.UUID


class EventCategoryAttach(BaseModel):
    category_ids: list[uuid.UUID]


# --- Attendance Schemas ---

class AttendanceQRResponse(BaseModel):
    token: str
    expires_at: datetime


class AttendanceScanRequest(BaseModel):
    token: str
    email: str | None = None
    walk_in: bool | None = None


# --- Reminder Schemas ---

class EventReminderCreate(BaseModel):
    option: str  # one_week | three_days | one_day


class EventReminderResponse(BaseModel):
    id: uuid.UUID
    event_id: uuid.UUID
    user_id: uuid.UUID
    option: str
    remind_at: datetime
    is_sent: bool
    sent_at: datetime | None = None

    model_config = {"from_attributes": True}


# --- My Events Schema (for dashboard) ---

class MyEventItem(BaseModel):
    event_id: uuid.UUID
    title: str
    start_datetime: datetime
    end_datetime: datetime
    type: EventType
    status: EventStatus
    my_role: EventParticipantRole | None = None


# --- Organizer Dashboard Schemas ---

class EventAttendanceStats(BaseModel):
    event_id: uuid.UUID
    total_audience: int
    attended_audience: int
    absent_audience: int
    total_participants: int
    attended_total: int


class EventChecklistItemCreate(BaseModel):
    title: str
    description: str | None = None
    assigned_user_id: uuid.UUID | None = None
    due_datetime: datetime | None = None


class EventChecklistItemUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    is_completed: bool | None = None
    assigned_user_id: uuid.UUID | None = None
    sort_order: int | None = None
    due_datetime: datetime | None = None


class EventChecklistItemResponse(BaseModel):
    id: uuid.UUID
    event_id: uuid.UUID
    title: str
    description: str | None = None
    is_completed: bool
    assigned_user_id: uuid.UUID | None = None
    sort_order: int
    due_datetime: datetime | None = None
    created_by_user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}